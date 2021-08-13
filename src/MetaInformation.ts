import { IConfig } from './config';
import * as ssri from 'ssri';

/**
 * The Interface which defines the format of the data that is returned when the details of a build are requested.
 */
interface IDetails {
	fileSize: number;
	sri: object;
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
	modules: {[name: string]: string};
	includedFiles: boolean | string[];
}

/**
 * Contains methods to provide extra information on requests which are being made to the server.
 * getDetails for example returns the hash of that file, the filesize, the includedFiles and the return time.
 * getLatest returns the hashes of the most recent files for that module.
 */
export default class MetaInformation {
	private _config;
	private _logger;
	private _id;

	/**
	 * Assigns the _config property to the config JSON file
	 * @param configIn the config JSON file to be refered to
	 */
	constructor(configIn: IConfig, logger, id: string) {
		this._config = configIn;
		this._logger = logger;
		this._id = id;
	}

	/**
	 * This method will return the filesize, hash, list of included files and the return time for a certain file.
	 *
	 * @param content The content of the file which is in question
	 * @param inclusion The sub files which are included in the overall file
	 * @param t0 The time at which the request started
	 */
	public getDetails(content: string, inclusion: string[], t0: number): IDetails {
		this._logger.debug(this._id + ' - Call for details succesful.');
		return {
			fileSize: content.length,
			sri:{"256": ssri.fromData(content, {algorithms:['sha256']})},
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
		return {
			filenames: this._config.fileNames,
			includedFiles,
			modules: URLIn.split('/').reduce((acc, cur) => {
				let a = cur.split('-');

				return {
					...acc,
					[a[0]]: a[1]
				}
			}, {}),
			url: URLIn,
		};
	}
}
