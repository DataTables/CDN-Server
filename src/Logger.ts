import * as winston from 'winston';

export default class Logger {

	private _debugger: boolean = false;
	private _logfile: boolean | string = false;
	private _errorLogFile: boolean | string = false;
	private _logger;
	private _errorLogger;
	private _logLocation: string;
	private _errorLogLocation: string;

	constructor(loggerDetails) {
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

		// Define the location of the logfile and errorLogFile based on the input parameter
		this._logLocation = typeof loggerDetails.logfile !== 'boolean' ? loggerDetails.logfile : '.hidden.log';
		this._errorLogLocation = typeof loggerDetails.errorLogFile !== 'boolean'
			? loggerDetails.errorLogFile
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

		// If the debugger option is enabled then set up a transport to the console
		if (this._debugger) {
			this._logger.add(new winston.transports.Console({format: myFormat}));
		}

		// If the logfile option is enabled then set up a transport to the logfile
		if (this._logfile) {
			this._logger.add(new winston.transports.File({filename: this._logLocation}));
		}

		// Add a transport for the pure error logging
		if (this._errorLogFile) {
			this._errorLogger.add(new winston.transports.File({filename: this._errorLogLocation}));
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
		// Prints `error` in red plus a message in white
		if (this._debugger || this._logfile) {
			message = '\x1b[31mERROR:\x1b[37m ' + message;
			this._logger.log({level: 'error', message});
		}
		if (this._errorLogFile) {
			this._errorLogger.log({level: 'error', message});
		}
	}

	public sudoError(message: string) {
		// Prints `error` in red plus a message in white regardless of whether the debugger is enabled or not
		message = '\x1b[31mERROR:\x1b[37m ' + message;
		this._logger.log({level: 'error', message});
		this._errorLogger.log({level: 'error', message});
	}

	public sudoInfo(message: string) {
		// Prints `info` in green plus a message in white regardless of whether the debugger is enabled or not
		message = '\x1b[32mINFO:\x1b[37m ' + message;
		this._logger.log({level: 'error', message});
	}

	public help() {
		let message =
`The following options are available when running the server:
	-h   help: info on how to run the server
	-d   debug: prints debug messages to the console when enabled
	-l   logfile: prints the debug lines to a file as specified (FILE MUST BE SPECIFIED)
	-m   metrics: allows the server to be monitored using the appmetrics-dash
	-c   configLoc: allows the server to be run with a custom config file at a location as specified

There are also a number of predefined npm commands
	\`npm run all\`      builds the server and then runs it
	\`npm run build\`    builds the server
	\`npm run server\`   runs the server
	\`npm run debug\`    runs the server with debug enabled`;
		this._logger.log({level: 'info', message});
	}
}
