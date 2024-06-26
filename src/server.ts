// Import libraries used within the server
import * as fileExtension from 'file-extension';
import * as getopts from 'getopts';
import * as http from 'http';
import * as mime from 'mime-types';
import * as cmp from 'semver-compare';
import * as util from 'util';

import { fstat, FSWatcher, readdirSync, readFile, statSync, watch } from 'fs';
import { join } from 'path';
import BuildFile from './BuildFile';
import Cache from './Cache';
import { IConfig, IElements } from './config';

import { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } from 'constants';
import { stringify } from 'querystring';
import validate from './config.validator';
import Logger from './Logger';
import MetaInformation from './MetaInformation';
import URLValidate from './URLValidate';

/**
 * Updates the in-memory config with versions found in packagesDir
 */
function updateVersions(element: string, versions: string[]): void {
	let sorted = versions.sort(cmp);
	logger.debug('Updating config: element [' + element + '], versions: [' + versions + ']');

	let el: IElements;
	for (el of config.elements) {
		if (el.folderName === element) {
			el.versions = versions;
		}
	}
}

/**
 * Checks directory found in packagesDir is a-x.y.z compliant
 */
function validateDirectory(dir: string): string[] {
	if (dir.length === 0) return undefined;

	let hyphen: number = dir.lastIndexOf('-');
	if (hyphen < 1 || hyphen > dir.length - 5) return undefined;

	let element: string = dir.slice(0, hyphen);
	let version: string = dir.slice(hyphen + 1);

	if (version.match(/^\d+(\.\d+){2}$/g) === null) return undefined;

	return [element, version];
}

/**
 * Fill in versions not found in packagesDir with empty array (could arguably flag an error)
 */
function setMissingVersions(): void {
	let el: IElements;
	for (el of config.elements) {
		if (el.versions === undefined) {
			logger.debug('No packages found for [' + el.abbr + ']');
			el.versions = [];
		}
	}
}

/**
 * Gets all the valid packages found in packagesDir
 */
function getPackagesDirectoryContents() {
	logger.debug('Reading packages directory [' + config.packagesDir + ']');
	let dirs: string[] = readdirSync(config.packagesDir).filter(function(file: string) {
		return statSync(join(config.packagesDir, file)).isDirectory();
	});

	if (dirs.length === 0) {
		logger.error('Fatal error: No packages found');
		process.exit(exitCodes.NoPackages);
	}

	let dir: string;
	let currentElement: string;
	let versions: string[] = [];

	for (dir of dirs) {
		let thisElement = validateDirectory(dir);
		if (thisElement === undefined) {
			// Must be at least a-x.y.z
			logger.debug('Skipping directory [' + dir + ']');
			continue;
		}

		if (thisElement[0] !== currentElement) {
			if (currentElement !== undefined) {
				updateVersions(currentElement, versions);
			}

			currentElement = thisElement[0];
			versions = [thisElement[1]];
		}
		else {
			versions.push(thisElement[1]);
		}
	}

	updateVersions(currentElement, versions);

	// Set the versions of unseen elements to an empy array (saves handling undefined all over the code)
	setMissingVersions();
}

/**
 * See if any versions are present in the config file (they're not supposed to be!)
 */
function checkVersionsPresent() {
	let el: IElements;
	for (el of config.elements) {
		if (el.versions !== undefined) {
			return true;
		}
	}

	return false;
}

/**
 * Create a watch on the file system in case files change
 */
function watchDirectory() {
	// nothing to do if not watching
	if (loggerDetails.nowatch) {
		logger.debug('Not watching directories');
		return;
	}

	// remove previous watch if one present
	if (watcher !== undefined) {
		logger.debug('Clearing watch');
		watcher.close();
	}
	// add a watch for the current directory
	logger.debug('Adding watch for [' + config.packagesDir + ']');
	try {
		watcher = watch(config.packagesDir, function() {
			logger.debug('Reread config as file system has changed');
			getConfig = true;
		});
	}
	catch (error) {
		logger.debug('Filesystem watch failed (' + error + ')');
		logger.error('Continuing with filesystem watching disabled');
	}
}

/**
 * Build a string with all the elements included (used by '/latest')
 */
function getAllElements(): string {
	let str: string = '';
	let el: IElements;

	for (el of config.elements) {
		if (str !== '') {
			str += ',';
		}

		str +=  el.abbr;
	}

	return str;
}

async function readConfig() {
	try {
		let input = await util.promisify(readFile)(argum.configLoc);
		config = JSON.parse(input.toString()) as IConfig;
		logger.debug('Config file loaded: ' + argum.configLoc);
	}
	catch (error) {
		logger.error('Error reloading config file');
		process.exit(exitCodes.BadConfig);
	}

	// Allow the elements property to be an object, where the key is the `abbr` name
	if (! Array.isArray(config.elements)) {
		config.elements = Object.keys(config.elements).map((key) => {
			let element = config.elements[key];

			element.abbr = key;

			return element;
		});
	}

	logger.debug('Validating Config File');

	let validation = validate(config);

	if (typeof validation === 'string') {
		logger.error('Error Validating config file: ' + validation);
		process.exit(exitCodes.BadConfig);

	}
	else if (checkVersionsPresent()) {
		logger.error('Error Validating config file - versions present');
		process.exit(exitCodes.VersionsPresent);
	}
	else {
		logger.debug('Config File Valid');
	}

	getPackagesDirectoryContents();
	watchDirectory();

	return config;
}

async function newHelp() {
	let helpLogger = new Logger(loggerDetails, true);
	helpLogger.help();
}

enum exitCodes {
	LogFile = 1,
	Exception,
	ConfigReload,
	Help,
	UnknownOptions,
	ErrorLogFile,
	MaxFiles,
	Frequency,
	MaxSize,
	Port,
	AccessLogFile,
	NoPackages,
	BadConfig,
	VersionsPresent,
	PortInUse
}

let argum = getopts(process.argv.slice(2), {
	alias: {
		accessLogFile: ['a', 'A'],
		configLoc: ['c', 'C'],
		debug: ['d', 'D'],
		errorLogFile: ['e', 'E'],
		frequency: ['f', 'F'],
		help: ['h', 'H'],
		logfile: ['l', 'L'],
		logLevel: ['logLevel'],
		maxFiles: ['x', 'X'],
		maxsize: ['s', 's'],
		metrics: ['m', 'M'],
		nowatch: ['n', 'N'],
		port: ['p', 'P'],
	},
	default: {
		accessLogFile: false,
		configLoc: './datatables-cdn.config.json',
		debug: false,
		errorLogFile: false,
		frequency: 'YYYY-MM-DD',
		help: false,
		logfile: false,
		logLevel: 'error',
		maxFiles: 5,
		maxsize: null,
		metrics: false,
		nowatch: false,
		port: 8080,
	}
});

let defaults: IConfig = {
	cacheDuration: 31557600,
	cacheSize: 100,
	elements: [],
	fileExtensions: [],
	fileNames: [],
	headerContent: '',
	latestAll: false,
	packagesDir: './dist',
	requires: [],
	selectHack: false,
	separators: ['/', ','],
	staticFileExtensions: [],
	staticFileTypes: [],
	substitutions: {},
};

let elementDefault: IElements = {
	abbr: '',
	excludes: [],
	fileIncludes: {},
	fileNames: {},
	moduleName: '',
	outputOrder: 0
};

// See which port we should be using
let port = argum.port;

let config: IConfig;
let getConfig = true;
let loggerDetails = {
	accessLogFile: argum.accessLogFile,
	debug: argum.debug,
	errorLogFile: argum.errorLogFile,
	frequency: argum.frequency,
	logfile: argum.logfile,
	logLevel: argum.logLevel,
	maxFiles: argum.maxFiles,
	maxsize: argum.maxsize,
	nowatch: argum.nowatch
};

let watcher: FSWatcher; // directory to watch for new packages

// if (argum.metrics) {
// 	require('appmetrics-dash').monitor();
// }

// Validation that the config is valid
readConfig();

let fail = false;
let exitCode;
if (loggerDetails.maxFiles === true) {
	console.log('\x1b[31mERROR:\x1b[37m maxFiles option set to true, requires a number of files to be specified. Ending.');
	loggerDetails.maxFiles = 5;
	fail = true;
	exitCode = exitCodes.MaxFiles;
}
else if (loggerDetails.frequency === true) {
	console.log('\x1b[31mERROR:\x1b[37m frequency option set to true, requires a frequency to be specified. Ending.');
	loggerDetails.frequency = 'YYYY-MM-DD';
	fail = true;
	exitCode = exitCodes.Frequency;
}
else if (loggerDetails.maxsize === true) {
	console.log('\x1b[31mERROR:\x1b[37m maxFiles option set to true, requires a number of files to be specified. Ending.');
	loggerDetails.maxsize = '100m';
	fail = true;
	exitCode = exitCodes.MaxSize;
}

if (fail) {
	newHelp();
	process.exit(exitCode);
}

let logger = new Logger(loggerDetails);

// If there are more options defined which are not defined then print the help and end server
if (Object.keys(argum).length > 37) {
	// Not sure of the value of this test but leaving in in case I'm missing something (COLIN)
	console.log('\x1b[31mERROR:\x1b[37m Unexpected command-line option. Ending.');
	logger.help();
	process.exit(exitCodes.UnknownOptions);
}
else if (loggerDetails.logfile === true) {
	console.log('\x1b[31mERROR:\x1b[37m Logfile option set to true but no file location specified. Ending.');
	logger.help();
	process.exit(exitCodes.LogFile);
}
else if (loggerDetails.errorLogFile === true) {
	console.log('\x1b[31mERROR:\x1b[37m ErrorLogFile option set to true but no file location specified. Ending.');
	logger.help();
	process.exit(exitCodes.ErrorLogFile);
}
else if (loggerDetails.accessLogFile === true) {
	console.log('\x1b[31mERROR:\x1b[37m AccessLogFile option set to true but no file location specified. Ending.');
	logger.help();
	process.exit(exitCodes.AccessLogFile);
}
else if (port === true) {
	console.log('\x1b[31mERROR:\x1b[37m port option set to true but no port specified. Ending.');
	logger.help();
	process.exit(exitCodes.Port);
}

if (argum.help === true) {
	loggerDetails.debug = true;
	logger = new Logger(loggerDetails);
	logger.help();
	process.exit(exitCodes.Help);
}

let cache = new Cache(null, logger, null);

/*
 * This is the server for requesting files to be built.
 * It validates the URL that it takes and builds the file before returning them to the user.
 */
let server = http.createServer(async function(req, res) {
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET');
	let id = (Math.random().toString(36).substring(2, 6) + Math.random().toString(36).substring(2, 6)).toUpperCase();
	logger.info(id + ' - New Request ' + req.url);
	logger.access(req.url);

	// If a signal is recieved to re-read the config file then wait until the next request
	// before reading it (to save signal handler time)
	if (getConfig) {
		let input = await readConfig();
		logger.debug('config Read' + argum.configLoc);

		config = {...defaults, ...input};
		for (let element of config.elements) {
			element = {...elementDefault};
		}

		// DD-1267 - the value in the config isn't being reread when server is signalled.
		config.latestAll = input.latestAll;

		cache.resetCache(config.cacheSize, config);
		logger.debug('Cache Reset');
		getConfig = false;
	}

	let t = new Date();
	let t0 = t.getTime();
	let url = new URLValidate(config, logger, cache._maps, id);
	let splitURL: string[] = req.url.split('?');

	// Ensure a valid request type is being made and validate that the requested url is also valid
	if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
		res.writeHead(405);
		logger.error(
			id + ' - 405 Bad Request. Types not permitted "POST", "PUT" and "DELETE". Type method attempted ' + req.method
		);
	}

	// If the URL has a latest parameter run the following to find the latest version of the listed modules
	else if (splitURL[0] === '/latest' && splitURL.length === 1 && !config.latestAll) {
		res.writeHead(404, 'Error 404. Invalid URL.' + req.url);
		logger.error(id + ' - 404 Invalid URL. latestAll not enabled but was requested.');
	}
	else if (splitURL[0] === '/latest') {
		logger.debug(id + ' - Latest versions requested.');

		let skipValidation: boolean = false;
		let findLatest: string;

		// Run validateLatest to validate the URL is legal and return the full URL required by the user
		// but don't bother validating if user wants all versions (since some are incompatible)
		if (splitURL.length === 1) {
			findLatest  = getAllElements();
			skipValidation = true;
		}
		else {
			findLatest = splitURL[1];
			skipValidation = false;
		}
		let latest = await url.validateLatest(findLatest, skipValidation);
		if (!latest) {
			res.writeHead(404, 'Error 404. Invalid URL.' + req.url);
			logger.error(id + ' - 404 Invalid URL. Failed to find latest version(s) of the module(s) requested. ' + req.url);
		}
		else {
			logger.debug(id + ' - URL Valid.');
			let meta = new MetaInformation(config, logger, id);
			let bui = new BuildFile(cache, config, argum.debug, logger, cache._maps, id);
			let content: any[] = [];
			let latestOptions: any[] = [];

			// For every filetype build the file and push to the array for hashing purposes
			for (let extension of config.fileExtensions) {
				let contentAddition = await bui.buildFile(latest + config.fileNames[0] + extension);

				if (!contentAddition) {
					res.writeHead(500);
					logger.error(id + ' - 500 Internal Server error. ' + req.url);
					res.end();
					return;
				}
				else if (typeof contentAddition === 'number'){
					res.writeHead(contentAddition);

					if(contentAddition === 400){
						logger.error(id + ' - ' + contentAddition.toString() + ' Error Bad Request. ' + req.url);
					}
					else if (contentAddition === 404) {
						logger.error(id + ' - ' + contentAddition + ' Error Not Found. ' + req.url);
					}
					else {
						logger.error(id + ' - ' + contentAddition + ' Error. ' + req.url);
					}

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
			logger.debug(id + ' - Latest succesfully found and returned');
		}
	}
	else if (await url.parseURL(splitURL[0])) {
		if (config.selectHack) {
			let parsedURL = splitURL[0].split(new RegExp('[' + config.separators.join('') + ']'));
			splitURL[0] = url.hackSelect(parsedURL).join('/');
		}
		logger.debug(id + ' - Requested file. Build commencing.');

		// Build requested file
		let bui = new BuildFile(cache, config, argum.debug, logger, cache._maps, id);
		let content = await bui.buildFile(splitURL[0]);

		if (content === false) {
			res.writeHead(500);
			logger.error(id + ' - 500 File not found when building file ' + req.url);
		}
		else if (content === 404) {
			res.writeHead(404);
			logger.error(id + ' - 404 File not found when building file ' + req.url);
		}
		else if (content === 400) {
			res.writeHead(400);
			logger.error(id + ' - 400 Bad request when building file ' + req.url);
		}
		else if (splitURL.indexOf('details') === 1 && typeof content === 'string') {
			logger.debug(id + ' - Getting Meta Info for build.');
			let meta = new MetaInformation(config, logger, id);
			res.writeHead(200, {
				'Cache-Control': 'max-age=' + config.cacheDuration,
			});
			res.write(JSON.stringify(meta.getDetails(content, await bui.getInclusions(), t0)));
			logger.debug(id + ' - Success. Returning Build Details');
		}
		else {
			logger.debug(id + ' - Standard file request');
			// Find the file type that has been requested and the content type for http
			let extension: string = fileExtension(splitURL[0]);
			let type = mime.lookup(extension);

			// Update for latest standards
			if (type === 'application/javascript') {
                                type = 'text/javascript';
                        }

			res.writeHead(200, {
				'Cache-Control': 'max-age=' + config.cacheDuration,
				'Content-Type': type + '; charset=utf-8',
			});
			// Return file
			res.write(content);
			logger.info(id + ' - Success. Returning File.');
		}
	}
	else {
		res.statusCode = 404;
		logger.error(id + ' - 404 Invalid URL ' + req.url);
	}
	logger.info(id + ' - Ending Request');
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
	process.exit(exitCodes.Exception);
});

server.once('error', function(err) {
	if(err['code'] === 'EADDRINUSE') {
		console.log('\x1b[31mERROR:\x1b[37m Port already in use - ' + port);
		logger.error('Port already in use - ' + port);
		process.exit(exitCodes.PortInUse);
	}
})

server.once('listening', function(){
	console.log('\x1b[32mINFO:\x1b[37m Server running on 0.0.0.0:' + port);
	logger.info('Server running on 0.0.0.0:' + port);
});
