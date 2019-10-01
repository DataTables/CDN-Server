//import * as winston from 'winston';
//require('winston-daily-rotate-file');

export default class Logger {

	private _debugger: boolean = false;
	private _logfile: boolean | string = false;
	private _errorLogFile: boolean | string = false;
	private _accessLogFile: boolean | string = false;
	private _logger;
	private _errorLogger;
	private _accessLogger;
	private _logLocation: string;
	private _errorLogLocation: string;
	private _accessLogLocation: string;
	private _maxSize;
	private _maxFiles;
	private _frequency;

	constructor(loggerDetails, fail = false) {
		var winston = require('winston');
		require('winston-daily-rotate-file');

		// Defined the custom format for the logger
		const myFormat = winston.format.printf(({level, message, label, timestamp}) => {
			return `${message}`;
		});
		this._debugger = loggerDetails.debug;

		// Define whether logging is to take place or not.
		//  This will only happen if the value of loggerDetails.logfile/loggerDetails.errorLogFile
		//   is a string detailing the location for the logfile/errorLogFile
		this._logfile = typeof loggerDetails.logfile !== 'boolean' ? true : false;
		this._errorLogFile = typeof loggerDetails.errorLogFile !== 'boolean' ? true : false;
		this._accessLogFile = typeof loggerDetails.accesLogFile !== 'boolean' ? true : false;

		// Define the location of the logfile and errorLogFile based on the input parameter
		this._logLocation = typeof loggerDetails.logfile !== 'boolean' ? loggerDetails.logfile : '.hidden.log';
		this._errorLogLocation = typeof loggerDetails.errorLogFile !== 'boolean'
			? loggerDetails.errorLogFile
			: '.hidden.log';
		this._accessLogLocation = typeof loggerDetails.accessLogFile !== 'boolean'
			? loggerDetails.accessLogFile
			: '.hidden.log';
		this._logger = winston.createLogger({
			defaultMeta: { service: 'user-service'},
			format: winston.format.json(),
			level: 'silly',
		});
		// Create another logger purely for the errors
		this._errorLogger = winston.createLogger({
			defaultMeta: { service: 'user-service'},
			format: winston.format.json(),
			level: 'silly',
		});
		this._accessLogger = winston.createLogger({
			defaultMeta: { service: 'user-service'},
			format: winston.format.json(),
			level: 'silly',
		});

		this._maxSize = loggerDetails.maxsize;
		this._maxFiles = loggerDetails.maxFiles;
		this._frequency = loggerDetails.frequency;

		var transportError = new (winston.transports.DailyRotateFile)({
			datePattern: this._frequency,
			filename: this._errorLogLocation,
			maxFiles: this._maxFiles,
			maxSize: this._maxSize,
			auditFile: '/tmp/somethingErrorful.json'
		});
		var transportAccess = new (winston.transports.DailyRotateFile)({
			datePattern: this._frequency,
			filename: this._accessLogLocation,
			maxFiles: this._maxFiles,
			maxSize: this._maxSize,
			auditFile: '/tmp/access.json'
		});

		var transport = new (winston.transports.DailyRotateFile)({
			datePattern: this._frequency,
			filename: this._logLocation,
			maxFiles: this._maxFiles,
			maxSize: this._maxSize,
			auditFile: '/tmp/something.json'
		});

		// If the debugger option is enabled then set up a transport to the console
		if (this._debugger) {
			this._logger.add(new winston.transports.Console({format: myFormat}));
		}

		// If the logfile option is enabled then set up a transport to the logfile
		if (this._logfile && !fail) {
			this._logger.add(transport);
			this.info('Max log file size set to ' + this._maxSize);
			this.info('Max number of log files set to ' + this._maxFiles);
			this.info('Frequency of rotation set to ' + this._frequency);
		}

		// Add a transport for the pure error logging
		if (this._errorLogFile && !fail) {
			this._errorLogger.add(transportError);
			this.info('Max error log file size set to ' + this._maxSize);
			this.info('Max number of error log files set to ' + this._maxFiles);
			this.info('Frequency of rotation set to ' + this._frequency);
		}

		if (this._accessLogFile && !fail) {
			this._accessLogger.add(transportAccess);
			this.info('Max access log file size set to ' + this._maxSize);
			this.info('Max number of access log files set to ' + this._maxFiles);
			this.info('Frequency of rotation set to ' + this._frequency);
		}
	}

	public info(message) {
		if (this._debugger || this._logfile) {
			// Prints `info` in green plus a message in white
			message = '\x1b[32mINFO:\x1b[37m ' + message;
			this._logger.log({level: 'info', message});
		}
	}

	public warn(message: string) {
		if (this._debugger || this._logfile) {
			// Prints `warn` in yellow plus a message in white
			message = '\x1b[33mWARN:\x1b[37m ' + message;
			this._logger.log({level: 'warn', message});
		}
	}

	public debug(message: string) {
		if (this._debugger || this._logfile) {
			// Prints `debug` in blue plus a message in white
			message = '\x1b[34mDEBUG:\x1b[37m ' + message;
			this._logger.log({level: 'debug', message});
		}
	}

	public error(message: string) {
		let stamp = new Date().toISOString();

		// Prints `error` in red plus a message in white
		if (this._debugger || this._logfile) {
			message = '\x1b[31mERROR:\x1b[37m ' + message;
			this._logger.log({level: 'error', message, stamp});
		}
		if (this._errorLogFile) {
			this._errorLogger.log({level: 'error', message, stamp});
		}
	}

	public access(message: string) {
		let stamp = new Date().toISOString();

		this._accessLogger.log({
			level: 'info',
			message,
			stamp
		});
	}

	public help() {
		let message =
`The following options are available when running the server:
	-h	help: info on how to run the server
	-a	accessLogFile: prints a message containing the requested URL to a file as specified (FILE MUST BE SPECIFIED)
	-d	debug: prints debug messages to the console when enabled
	-e	errorLogFile: prints the error messages to a file as specified (FILE MUST BE SPECIFIED)
	-l	logfile: prints the debug lines to a file as specified (FILE MUST BE SPECIFIED)
	-m	metrics: allows the server to be monitored using the appmetrics-dash
	-c	configLoc: allows the server to be run with a custom config file at a location as specified
	-s	maxsize: sets the maximum size of the log files. Uses default of null if not specified.
	-f	frequency: sets the frequency of which the log files are to be rotated. This is a string which is layed out in the format of a date.
		The least significant part of the date will be the log rotation period. Uses default of YYYY-MM-DD.
		For more info on writing these formats visit https://momentjs.com/docs/#/displaying/format/
	-x	maxFiles: The maximum number of log files that the server should store before they are rotated. The default value is 5.
	-p	port: The port that the server should run on. The default is 8080.

There are also a number of predefined npm commands
	\`npm run all\`      builds the server and then runs it
	\`npm run build\`    builds the server
	\`npm run server\`   runs the server
	\`npm run debug\`    runs the server with debug enabled`;
		this._logger.log({level: 'info', message});
	}
}
