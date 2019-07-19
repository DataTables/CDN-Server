// Import libraries used within the server
import * as fileExtension from 'file-extension';
import * as fs from 'fs';
import * as getopts from 'getopts';
import * as http from 'http';
import * as mime from 'mime-types';
import * as util from 'util';
import * as winston from 'winston';
import BuildFile from './BuildFile';
import Cache from './Cache';
import Details from './Details';
import URLValidate from './URLValidate';

let reReadConfig = false;
let argum = getopts(process.argv.slice(2), {
	alias: {
		configLoc: ['c', 'C'],
		debug: ['d', 'D'],
		logfile: ['l', 'L']
	},
	default: {
		configLoc: '../config.json',
		debug: false,
		logfile: false

	}
});
let port;

/**
 * See which port we should be using
 */
if (process.env.DT_CDN_SERVER_PORT) {
	port = process.env.DT_CDN_SERVER_PORT;
}
else  {
	port = 8080;
}

let config;
try {
	config = require(argum.configLoc);
}
catch (error) {
	console.log('Invalid JSON');
	process.exit();
}
interface IConfig {
	/**
	 * The location of the top level file containing all of the sub folders for build files.
	 */
	buildLocation: string;
	/**
	 * The message to be included at the top of the finished file.
	 */
	buildMessage: string;
	/**
	 * The number of files that will be stored in the cache at any given time.
	 */
	cacheSize: number;
	/**
	 * All of the modules that may be included in to build file.
	 */
	elements: IElements[];
	/**
	 * A list of the permitted names of files to be requested from the builder.
	 */
	fileNames: string[];
	/**
	 * A list of the orders that must appear in the request URL in order for a build to be succesful.
	 */
	requires: number[];
	/**
	 * Substitutions to be made throughout the built file.
	 *
	 * There are 2 predefined substitutions, extensionURL and extensionList.
	 * These provide the build message with custom data relating to the file that has been requested.
	 */
	substitutions: {[key: string]: string};
}
interface IElements {
	/**
	 * The abbreviation of the module as seen in the URL.
	 */
	abbr: string;
	/**
	 * The abbreviation of any modules that are not permitted alongside this one should be noted here.
	 */
	excludes: string[];
	/**
	 *  Any entries into file Includes will be replaced in a forward match manner.
	 */
	fileIncludes: {[key: string]: string};
	/**
	 * The key in fileNames should be the file type of the given file names inside the corresponding array.
	 */
	fileNames: {[key: string]: string[]};
	/**
	 * The name of the target folder that holds the desired files for this module.
	 */
	folderName: string;
	/**
	 * The order represents the order that the modules must be loaded in.
	 *
	 * Eg. Modules with order 20 must come before a module of order 30 and after any of order 10.
	 */
	order: number;
	/**
	 * A list of the available versions for this module.
	 */
	versions: string[];
}

let cache = new Cache(config);
/**
 * This is the server for requesting files to be built.
 * It validates the URL that it takes and builds the file before returning them to the user.
 */
http.createServer(async function(req, res) {
	let t = new Date();
	let t0 = t.getTime();
	if (reReadConfig) {
		let input = await util.promisify(fs.readFile)(argum.configLoc);
		config = JSON.parse(input.toString());
		cache.resetCache(config);
	}
	let URL = new URLValidate(config);
	let splitURL: string[] = req.url.split('?');

	// if debugging then create a debug object to return data
	let debug;
	if (argum.debug) {
		debug = {
			agent: req.headers['user-agent'],
			buildTime: 0,
			fileSize: 0,
			includes: '',
			ip: req.connection.remoteAddress,
			time: t0,
			url: req.url
		};
	}
	// Ensure a valid request type is being made and validate that the requested url is also valid
	if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
		res.write('405 Bad Request');
		res.statusCode = 405;
	}
	// If the URL has a latest parameter run the following to find the latest version of the listed modules
	else if (splitURL.length > 1 && splitURL[1].split('=').indexOf('latest') === 0) {
		let findLatest = splitURL[1].split('=');
		// Run validateLatest to validate the URL is legal and return the full URL required by the user
		let latest = URL.validateLatest(findLatest[1]);
		// If false then error in the url
		if (!latest) {
			res.write('Error 404. Invalid URL');
		}
		else {
			let details = new Details(config);
			let Bui = new BuildFile(cache, config);
			let content: any[] = [];
			let latestOptions: any[] = [];
			// For every filetype build the file and push to the array for hashing purposes
			for (let i = 0; i < config.fileTypes.length; i++) {
				content.push(await Bui.buildFile(latest + config.fileNames[0] + config.fileTypes[i]));
				latestOptions.push(latest + config.fileNames[0] + config.fileTypes[i]);
			}
			res.write(
				JSON.stringify(
					details.getLatest(
						content,
						await Bui.getInclusions(),
						latest.toString(),
						config.fileNames[0]
					)
				)
			);
		}
	}
	// If debugging then run the standard process then log either to console or to the
	// log file if that argument is included.
	else if (argum.debug) {
		if (URL.parseURL(splitURL[0])) {
			let Bui = new BuildFile(cache, config);
			let content = await Bui.buildFile(splitURL[0]);
			let details = new Details(config);
			let stats = details.getDetails(content, await Bui.getInclusions(), t0);
			debug.buildTime = stats.returnTime;
			debug.fileSize = stats.fileSize;
			debug.includes = stats.includedFiles;
			if (!argum.logfile) {
				console.log(debug);
			}
			else {
				const logger = winston.createLogger({
					level: 'silly',
					format: winston.format.json(),
					defaultMeta: { service: 'user-service'},
					transports: [
						new winston.transports.File({filename: 'error.log', level: 'error'}),
						new winston.transports.File({filename: 'combined.log'}),
						new winston.transports.Console()
					]
				});
				// logger.log({level: 'debug', message: debug});
				logger.info(debug);
			}
		}
		res.write(JSON.stringify(debug));
		res.statusCode = 200;
	}
	else if (URL.parseURL(splitURL[0])) {

		// Build requested file
		let Bui = new BuildFile(cache, config);
		let content = await Bui.buildFile(splitURL[0]);

		if (content === false) {

			res.write('Error 500. File not Found');
			res.statusCode = 500;

		}
		else if (splitURL.indexOf('details') === 1) {
			let details = new Details(config);
			res.write(JSON.stringify(details.getDetails(content, await Bui.getInclusions(), t0)));
			res.statusCode = 200;
		}
		else {

			// Find the file type that has been requested and the content type for http
			let extension: string = fileExtension(splitURL[0]);
			let type = mime.lookup(extension);
			res.writeHead(200, {
				'Content-Type': type + '; charset=utf-8'
			});

			// Return file
			res.write(content);
		}
		res.end();
	}
	else {
		res.statusCode = 404;
	}
	res.end();
}).listen(port);

process.on('SIGUSR1', () => {
	// config = require('./config.json');
	reReadConfig = true;
});

process.on('unhandledRejection', (reason, p) => {
	console.error(reason, 'Unhandled Rejection at Promise', p);
});

process.on('uncaughtException', err => {
	console.error(err, 'Uncaught Exception thrown');
	process.exit(1);
});
