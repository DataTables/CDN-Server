// Import libraries used within the server
import * as fileExtension from 'file-extension';
import * as fs from 'fs';
import * as getopts from 'getopts';
import * as http from 'http';
import * as mime from 'mime-types';
import * as util from 'util';
import BuildFile from './BuildFile';
import Cache from './Cache';
import {IConfig} from './config';
import validate from './config.validator';
import Logger from './Logger';
import MetaInformation from './MetaInformation';
import URLValidate from './URLValidate';

let argum = getopts(process.argv.slice(2), {
	alias: {
		configLoc: ['c', 'C'],
		debug: ['d', 'D'],
		errorLogFile: ['e', 'E'],
		frequency: ['f', 'F'],
		help: ['h', 'H'],
		logfile: ['l', 'L'],
		maxFiles: ['x', 'X'],
		maxsize: ['s', 's'],
		metrics: ['m', 'M'],
	},
	default: {
		configLoc: './datatables-cdn.config.json',
		debug: false,
		errorLogFile: false,
		frequency: '1d',
		help: false,
		logfile: false,
		maxFiles: 5,
		maxsize: 104857600,
		metrics: false,
	}
});

let defaults: IConfig = {
	cacheDuration: 31557600,
	cacheSize: 100,
	elements: [],
	fileExtensions: [],
	fileNames: [],
	headerContent: '',
	packagesDir: './dist',
	requires: [],
	separators: ['/', ','],
	staticFileExtensions: [],
	staticFileTypes: [],
	substitutions: {},
};

// See which port we should be using
let port = process.env.DT_CDN_SERVER_PORT ?
	process.env.DT_CDN_SERVER_PORT :
	8080;

let config: IConfig;
let getConfig = true;
let loggerDetails = {
	debug: argum.debug,
	errorLogFile: argum.errorLogFile,
	logfile: argum.logfile,
	maxsize: argum.maxsize,
	maxFiles: argum.maxFiles,
	frequency: argum.frequency
};

if (argum.metrics) {
	require('appmetrics-dash').monitor();
}

// Validation that the config is valid
readConfig();

let logger = new Logger(loggerDetails);

// If there are more options defined which are not defined then print the help and end server
if (Object.keys(argum).length > 27) {
	logger.help();
	process.exit(5);
}
else if (loggerDetails.logfile === true) {
	logger.sudoError('Logfile option set to true but no file location specified. Ending.');
	logger.help();
	process.exit(1);
}
else if (loggerDetails.errorLogFile === true) {
	logger.sudoError('ErrorLogFile option set to true but no file location specified. Ending.');
	logger.help();
	process.exit(6);
}

if (argum.help === true) {
	loggerDetails.debug = true;
	logger = new Logger(loggerDetails);
	logger.help();
	process.exit(4);
}

let cache = new Cache(null, logger, null);

/*
 * This is the server for requesting files to be built.
 * It validates the URL that it takes and builds the file before returning them to the user.
 */
http.createServer(async function(req, res) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
	logger.info('New Request ' + req.url);

	// If a signal is recieved to re-read the config file then wait until the next request
	// before reading it (to save signal handler time)
	if (getConfig) {
		let input = await readConfig();
		logger.debug('config Read' + argum.configLoc);
		config = Object.assign(defaults, input);
		cache.resetCache(config.cacheSize, config);
		logger.debug('Cache Reset');
		getConfig = false;
	}

	let t = new Date();
	let t0 = t.getTime();
	let url = new URLValidate(config, logger, cache._maps);
	let splitURL: string[] = req.url.split('?');

	// Ensure a valid request type is being made and validate that the requested url is also valid
	if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
		res.writeHead(405);
		logger.error('405 Bad Request. Types not permitted "POST", "PUT" and "DELETE". Type method attempted ' + req.method);
	}

	// If the URL has a latest parameter run the following to find the latest version of the listed modules
	else if (splitURL.length > 1 && splitURL[0] === '/latest') {
		logger.debug('Latest versions requested.');
		let findLatest = splitURL[1].split('=');

		// Run validateLatest to validate the URL is legal and return the full URL required by the user
		let latest = await url.validateLatest(findLatest[0]);

		if (!latest) {
			res.writeHead(404, 'Error 404. Invalid URL.');
			logger.error('404 Invalid URL. Failed to find latest version(s) of the module(s) requested.');
		}
		else {
			logger.debug('URL Valid.');
			let meta = new MetaInformation(config, logger);
			let bui = new BuildFile(cache, config, argum.debug, logger, cache._maps);
			let content: any[] = [];
			let latestOptions: any[] = [];

			// For every filetype build the file and push to the array for hashing purposes
			for (let extension of config.fileExtensions) {
				let contentAddition = await bui.buildFile(latest + config.fileNames[0] + extension);
				if (!contentAddition) {
					res.writeHead(500);
					logger.error('500 Internal Server error.');
					res.end();
					return;
				}
				content.push(contentAddition);
				latestOptions.push(latest + config.fileNames[0] + extension);
			}

			res.write(
				JSON.stringify(
					// Returns the IDetails JSON Object
					meta.getLatest(
						content,
						bui.getInclusions(),
						latest.toString()
					)
				)
			);
			logger.debug('Latest succesfully found and returned');
		}
	}
	else if (await url.parseURL(splitURL[0])) {
		logger.debug('Requested file. Build commencing.');

		// Build requested file
		let bui = new BuildFile(cache, config, argum.debug, logger, cache._maps);
		let content = await bui.buildFile(splitURL[0]);

		if (content === false) {
			res.writeHead(500);
			logger.error('500 File not found when building file');
		}
		else if (content === 404) {
			res.writeHead(404);
			logger.error('404 File not found when building file');
		}
		else if (splitURL.indexOf('details') === 1 && typeof content === 'string') {
			logger.debug('Getting Meta Info for build.');
			let meta = new MetaInformation(config, logger);
			res.writeHead(200, {
				'Cache-Control': 'max-age=' + config.cacheDuration,
			});
			res.write(JSON.stringify(meta.getDetails(content, await bui.getInclusions(), t0)));
			logger.debug('Success. Returning Build Details');
		}
		else {
			logger.debug('Standard file request');
			// Find the file type that has been requested and the content type for http
			let extension: string = fileExtension(splitURL[0]);
			let type = mime.lookup(extension);
			res.writeHead(200, {
				'Cache-Control': 'max-age=' + config.cacheDuration,
				'Content-Type': type + '; charset=utf-8',
			});
			// Return file
			res.write(content);
			logger.info('Success. Returning File.');
		}
	}
	else {
		res.statusCode = 404;
		logger.error('404 Invalid URL');
	}
	logger.info('Ending Request');
	res.end();
}).listen(port);

// Function to cause the config to be re read when a SIGUSR1 signal is recieved.
process.on('SIGUSR1', () => {
	getConfig = true;
	logger.debug('Reread Config Signal Recieved');
});

process.on('unhandledRejection', (reason, p) => {
	logger.debug(reason + ' Unhandled Rejection at Promise ' + p);
});

process.on('uncaughtException', err => {
	logger.error(err + ' Uncaught exception thrown');
	process.exit(2);
});

async function readConfig() {
	try {
		let input = await util.promisify(fs.readFile)(argum.configLoc);
		config = JSON.parse(input.toString()) as IConfig;
		logger.debug('Config file loaded');
	}
	catch (error) {
		logger.error('Error reloading config file');
		process.exit(3);
	}

	logger.debug('Validating Config File');

	if (validate(config)) {
		logger.debug('Config File Valid');
	}
	else {
		logger.error('Error Validating config file.');
		process.exit(6);
	}

	return config;
}

logger.info('Server running. Listening on port ' + port);
