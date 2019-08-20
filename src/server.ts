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
import {IConfig} from './config';
import Logger from './Logger';
import MetaInformation from './MetaInformation';
import URLValidate from './URLValidate';

let reReadConfig = false;
let argum = getopts(process.argv.slice(2), {
	alias: {
		configLoc: ['c', 'C'],
		debug: ['d', 'D'],
		logfile: ['l', 'L'],
		metrics: ['m', 'M'],
	},
	default: {
		configLoc: './datatables-cdn.config.json',
		debug: false,
		logfile: false,
		metrics: false,
	}
});

let defaults = {
	cacheDuration: 31557600,
	separators: ["/", ","]
}

/**
 * See which port we should be using
 */
let port = process.env.DT_CDN_SERVER_PORT ?
	process.env.DT_CDN_SERVER_PORT :
	8080;

let config: IConfig;
let getConfig = true;
let loggerDetails = {
	debug: argum.debug,
	logfile: argum.logfile
};

if (argum.metrics) {
	require('appmetrics-dash').monitor();
}

if (loggerDetails.logfile === true) {
	process.exit(1);
}

// Validation that the config is valid
readConfig();

let logger = new Logger(loggerDetails);

let cache = new Cache(null, logger);
/*
 * This is the server for requesting files to be built.
 * It validates the URL that it takes and builds the file before returning them to the user.
 */
http.createServer(async function(req, res) {
	logger.info('New Request ' + req.url);
	if (getConfig) {
		let input = await readConfig();
		logger.debug('Config Read ' + argum.configLoc);
		config = Object.assign(defaults, input);
		cache.resetCache(config.cacheSize);
		logger.debug('Cache Reset');
		getConfig = false;
	}
	let t = new Date();
	let t0 = t.getTime();

	// If a signal is recieved to re-read the config file then wait until the next request
	// before reading it (to save signal handler time)
	if (reReadConfig) {
		let input = await readConfig();
		logger.debug('config Read' + argum.configLoc);
		config = Object.assign(defaults, input);
		reReadConfig = false;
	}

	let url = new URLValidate(config, logger);
	let splitURL: string[] = req.url.split('?');

	// if debugging then create a debug object to return data
	let debug = {
			agent: req.headers['user-agent'],
			buildTime: 0,
			fileSize: 0,
			includes: [],
			ip: req.connection.remoteAddress,
			time: t0,
			url: req.url
		};

	// Ensure a valid request type is being made and validate that the requested url is also valid
	if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
		res.writeHead(405);
		logger.error('405 Bad Request. Types not permitted "POST", "PUT" and "DELETE". Type method attempted ' + req.method);
	}

	// If the URL has a latest parameter run the following to find the latest version of the listed modules
	else if (splitURL.length > 1 && splitURL[1].split('=').indexOf('latest') === 0) {
		logger.debug('Latest versions requested.');
		let findLatest = splitURL[1].split('=');
		// Run validateLatest to validate the URL is legal and return the full URL required by the user
		let latest = url.validateLatest(findLatest[1]);

		if (!latest) {
			res.writeHead(404, 'Error 404. Invalid URL.');
			logger.error('404 Invalid URL. Failed to find latest version(s) of the module(s) requested.');
		}
		else {
			logger.debug('URL Valid.');
			let meta = new MetaInformation(config, logger);
			let bui = new BuildFile(cache, config, argum.debug, logger);
			let content: any[] = [];
			let latestOptions: any[] = [];

			// For every filetype build the file and push to the array for hashing purposes
			for (let extension of config.fileExtensions) {
				content.push(await bui.buildFile(latest + config.fileNames[0] + extension));
				latestOptions.push(latest + config.fileNames[0] + extension);
			}

			res.write(
				JSON.stringify(
					// Returns the IDetails JSON Object
					meta.getLatest(
						content,
						bui.getInclusions(),
						latest.toString(),
						config.fileNames[0]
					)
				)
			);
			logger.debug('Latest succesfully found and returned');
		}
	}
	else if (url.parseURL(splitURL[0])) {
		logger.debug('Requested file. Build commencing.');
		// Build requested file
		let bui = new BuildFile(cache, config, argum.debug, logger);
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
			res.write(JSON.stringify(meta.getDetails(content, await bui.getInclusions(), t0)));
			res.writeHead(200, {
				'Cache-Control': 'max-age=' + config.cacheDuration,
			});
			logger.debug('Success. Returning Build Details');
		}
		else {
			logger.debug('Standard file request');
			// Find the file type that has been requested and the content type for http
			let extension: string = fileExtension(splitURL[0]);
			let type = mime.lookup(extension);
			res.writeHead(200, {
				'Content-Type': type + '; charset=utf-8',
				'Cache-Control': 'max-age=' + config.cacheDuration,
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
	reReadConfig = true;
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
		config = JSON.parse(input.toString());
		logger.debug('Config file loaded');
		return config;
	}
	catch (error) {
		logger.error('Error reloading config file');
		process.exit(3);
	}
}

logger.info('Server running. Listening on port ' + port);
