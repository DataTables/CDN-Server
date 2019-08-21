import * as winston from 'winston';

export default class Logger {

	private _debugger: boolean = false;
	private _logfile: boolean | string = false;
	private _logger;
	private _logLocation: string;

	constructor(loggerDetails) {
		const myFormat = winston.format.printf(({level, message, label, timestamp}) => {
			return `${message}`;
		});
		this._debugger = loggerDetails.debug;
		this._logfile = typeof loggerDetails.logfile !== 'boolean' ? true : false;
		this._logLocation = typeof loggerDetails.logfile !== 'boolean' ? loggerDetails.logfile : '.hidden.log';
		this._logger = winston.createLogger({
			defaultMeta: { service: 'user-service'},
			format: winston.format.json(),
			level: 'silly',
		});
		if (this._debugger) {
			this._logger.add(new winston.transports.Console({format: myFormat}));
		}
		if (this._logfile) {
			this._logger.add(new winston.transports.File({filename: this._logLocation}));
		}
	}

	public info(message) {
		if (this._debugger || this._logfile) {
			message = '\x1b[32mINFO:\x1b[37m ' + message;
			this._logger.log({level: 'info', message});
		}
	}

	public warn(message: string) {
		if (this._debugger || this._logfile) {
			message = '\x1b[33mWARN:\x1b[37m ' + message;
			this._logger.log({level: 'warn', message});
		}
	}

	public debug(message: string) {
		if (this._debugger || this._logfile) {
			message = '\x1b[34mDEBUG:\x1b[37m ' + message;
			this._logger.log({level: 'debug', message});
		}
	}

	public error(message: string) {
		if (this._debugger || this._logfile) {
			message = '\x1b[31mERROR:\x1b[37m ' + message;
			this._logger.log({level: 'error', message});
		}
	}

	public sudoError(message: string){
		message = '\x1b[31mERROR:\x1b[37m ' + message;
		this._logger.log({level: 'error', message});
	}

	public sudoInfo(message: string){
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
