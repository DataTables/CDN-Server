import { IConfig } from './config';

const hash = require('hash.js');

/**
 * The Interface which defines the format of the data that is returned when the details of a build are requested.
 */
interface IDetails {
	fileSize: number;
	hash: string;
	includedFiles: string[];
	returnTime: number;
}

/**
 * The interface which defines the format of the data that is returned
 *   when the details of the latest build versions are requested.
 */
interface ILatest {
	url: string;
	filenames: string[];
	files: IFiles;
	includedFiles: boolean | string[];
}

/**
 * The interface which defines the format of the files object within the ILatest Interface.
 * This holds the file types objects.
 */
interface IFiles {
	css: ITypes;
	js: ITypes;
}

/**
 * The interface which defines the format of the css and js objects withing the IFiles interface.
 *   This holds the hashes of the files.
 */
interface ITypes {
	debug: string;
	min: string;
}

/**
 * Contains methods to provide extra information on requests which are being made to the server.
 * getDetails for example returns the hash of that file, the filesize, the includedFiles and the return time.
 * getLatest returns the hashes of the most recent files for that module.
 */
export default class MetaInformation {
	private _config;
	private _logger;

	/**
	 * Assigns the _config property to the config JSON file
	 * @param configIn the config JSON file to be refered to
	 */
	constructor(configIn: IConfig, logger) {
		this._config = configIn;
		this._logger = logger;
	}

	/**
	 * This method will return the filesize, hash, list of included files and the return time for a certain file.
	 *
	 * @param content The content of the file which is in question
	 * @param inclusion The sub files which are included in the overall file
	 * @param t0 The time at which the request started
	 */
	public getDetails(content: string, inclusion: string[], t0: number): IDetails {
		this._logger.debug('Call for details succesful.');
		return {
			fileSize: content.length,
			hash: 'sha256-' + hash.sha256().update(content).digest('hex'),
			includedFiles: inclusion,
			returnTime: new Date().getTime() - t0,
		};
	}

	/**
	 * This method will return the URL for the latest versions of any given module in the parameter.
	 *
	 * @param content The content of the file which is in question
	 * @param includedFiles A list of all of the sub files which have been included in the final file
	 * @param URLIn The URL which needs to be requested to get the latest versions of the files,
	 *   this is appended with an ellipsis as the file type will need to be selected by the user requestee
	 * @param filenameIn The name of the file which is in question
	 */
	public getLatest(content: any[], includedFiles: boolean | string[], URLIn: string): ILatest {
		this._logger.debug('Call for latest succesful.');
		return {
			filenames: this._config.fileNames,
			files: {
				css: {
					debug: 'sha256-' + hash.sha256().update(content[this._config.fileExtensions.indexOf('.css')]).digest('hex'),
					min: 'sha256-' + hash.sha256().update(content[this._config.fileExtensions.indexOf('.min.css')]).digest('hex')
				},
				js: {
					debug: 'sha256-' + hash.sha256().update(content[this._config.fileExtensions.indexOf('.js')]).digest('hex'),
					min: 'sha256-' + hash.sha256().update(content[this._config.fileExtensions.indexOf('.min.js')]).digest('hex')
				}
			},
			includedFiles,
			url: URLIn,
		};
	}
}
