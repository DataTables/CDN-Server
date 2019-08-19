import Cache from './Cache';
import {IConfig} from './config';

import * as fs from 'fs';
import * as util from 'util';

/**
 * This interface defines the format of the object to hold the details of all of the individual
 *   elements required to build the file.
 */
interface IDetails {
	version: string;
	folderName: string;
	fileNameMap: Map <string, string[]>;
	order: number;
}

/**
 * This interface defines the format of the Includes object used throughout the BuildFile Class.
 */
interface IIncludes {
	[key: string]: string;
}

const fileExists = util.promisify(fs.readFile);
/**
 * This class will return a file that contains all of the modules listed in the filePath.
 */
export default class BuildFile {
	private _config: IConfig;
	private _storedFiles: Cache;
	private _includedFiles: string[] = [];
	private _debug: boolean = false;
	private _logger;

	/**
	 * The constructor initialises the cache, reads in the configuration for the
	 * CDN Server and whether it is to be run in debug mode.
	 * @param cache The current Cache of most recent files to have been requested
	 * @param configIn The configuration of the CDN Server. This includes the build
	 *   location of the files and all of their details.
	 * @param debug A boolean value to defined whether the Server is being run in debug mode.
	 */
	constructor(cache: Cache, configIn: IConfig, debug: boolean, logger) {
		this._storedFiles = cache;
		this._config = configIn;
		this._debug = debug;
		this._logger = logger;
	}

	/**
	 * Fetches all of the sub files and converges them all into one final file to be returned to the user
	 * @param filePath The path of the file specified. Each element specifies a module to be included.
	 * @returns {boolean | string} Returns the file content if it is built succesfully and a boolean value
	 *   to indicate a failure.
	 */
	public async buildFile(filePath: string): Promise<boolean | string | number> {
		this._logger.debug('Starting Build File');
		// Split URL into useful chunks and remove the first element if it is empty.
		let parsedURL = filePath.split('/');

		// If the parsedURL's first element is and empty string then it begins with a '/',
		//   which is legal but will cause errors further on unless we remove the empty string from the array.
		//   If the URL Requested contains multiple '/'s at the start of the URL then this
		//   will be picked up in the Validation stage.
		if (parsedURL[0] === '') {
			parsedURL.splice(0, 1);
		}

		let cloneParsedURL = parsedURL.slice();
		cloneParsedURL.pop();
		filePath = cloneParsedURL.join('/');

		// Create a mapping between the URL Abbreviations, folder names, file names, order and includes
		let folderNameMap = new Map<string, string>();
		let moduleNameMap = new Map<string, string>();

		// FileNameMap maps the abbreviation to a map of the file type(js,css,etc...) to an array of the files to be built
		let fileNameMap = new Map<string, Map<string, string[]>>();
		let orderMap = new Map <string, number>();
		let includesMap = new Map <string, {}>();

		for (let element of this._config.elements) {
			let fileKeys = Object.keys(element.fileNames);
			let fileValues = Object.values(element.fileNames);

			// This is the map between the file type and the array of files to be built
			let tempMap = new Map <string, string[]>();

			for (let j = 0; j < fileKeys.length; j++) {
				tempMap.set(fileKeys[j], fileValues[j]);
			}

			folderNameMap.set(element.abbr, element.folderName);
			moduleNameMap.set(element.abbr, element.moduleName);
			orderMap.set(element.abbr, element.order);

			if (fileKeys.length > 0) {
				fileNameMap.set(element.abbr, tempMap);
			}

			// Only create mapping if the includes contains at least one property
			if (Object.keys(element.fileIncludes).length > 0) {
				includesMap.set(element.abbr, element.fileIncludes);
			}
		}

		// Grab the Folder names, File names, versions, orders and includes and add them to a list.
		let parsedDetails: IDetails[] = [];
		let includesList: IIncludes = {};
		let extensionsList: string = '';
		let extensionsListArray: string[] = [];

		this._logger.debug('Retrieving relevant data for build');
		for (let i = 0; i < parsedURL.length; i++) {
			let folderName: string;
			let fileName: Map < string, string [] >;
			let vers: string;
			let order: number;
			let strParsed = parsedURL[i].split('-');

			// If the URL includes a version add a '-' to the abbreviation as in config,
			// otherwise no version is associated with this element so push an empty string
			if (strParsed.length > 1) {
				this._logger.debug('Version included in module');
				strParsed[0] += '-';
				vers = strParsed[strParsed.length - 1];

				// If the URL splits to 3 or more it must be a Sub-Extension, so add the second part of the abbreviation
				if (strParsed.length > 2) {
					for (let j = 1; j < strParsed.length - 1; j++) {
						strParsed[0] += strParsed[j];
						strParsed[0] += '-';
					}
				}
			}
			else {
				this._logger.debug('Version not included in module');
				vers = '';
			}

			order = orderMap.get(strParsed[0]);
			folderName = folderNameMap.get(strParsed[0]);

			this._logger.debug('Creating list of extensions for ' + strParsed);
			// Create the string to replace the `{extensionsList}` macro in the built file as defined in config
			if (strParsed.length > 1 && i < parsedURL.length - 1) {
				this._logger.debug('Adding to extensionsList ' + moduleNameMap.get(strParsed[0]));
				extensionsListArray.push(moduleNameMap.get(strParsed[0]) + ' ' + strParsed[strParsed.length - 1]);
			}

			fileName = fileNameMap.get(strParsed[0]);

			parsedDetails.push({
				fileNameMap: fileName,
				folderName,
				order,
				version: vers,
			});

			// If the string has styling or similar that need to be included with it
			//   then this is where they are added to the includes list.
			if (includesMap.get(strParsed[0]) !== undefined) {
				let keys: string[] = Object.keys(includesMap.get(strParsed[0]));
				let vals: string[] = Object.values(includesMap.get(strParsed[0]));
				for (let j = 0; j < keys.length; j++) {
					includesList[keys[j]] = vals[j];
				}
			}
		}

		extensionsList += extensionsListArray.join(', ');

		// From the file name, identify filetype, and whether the minified version is to be built
		let splitFileName: string[] = parsedURL[parsedURL.length - 1].split('.');
		let type: string = '.' + splitFileName[splitFileName.length - 1];
		let min: boolean = splitFileName.length > 2 ? true : false;

		this._logger.debug('Constructing file');
		// Call function to _build the required file
		let file = await this._build(parsedURL, type, min, parsedDetails, includesList);

		// Replace macros in the file as defined in the this._config
		if (!file) {
			this._logger.error('File unable to be built');
			return false;
		}
		else if (typeof file === 'number'){
			this._logger.error('File unable to be built');
			return file;
		}
		else if (typeof file === 'string') {
			this._logger.debug('File built succesfully, replacing macros');
			let substitutions = this._config.substitutions;
			for (let substitution of Object.keys(substitutions)) {
				if (substitution === '_extensionsList') {
					while (file.indexOf(substitutions._extensionsList) !== -1) {
						file = file.replace(substitutions._extensionsList, extensionsList);
					}
				}
				else if (substitution === '_extensionsURL') {
					while (file.indexOf(substitutions._extensionsURL) !== -1) {
						file = file.replace(substitutions._extensionsURL, filePath);
					}
				}
				else if (substitution === '_source') {
					while (file.indexOf(substitutions._source) !== -1) {
						file = file.replace(substitutions._source, '"' + filePath + '"');
					}
				}
				else {
					while (file.indexOf(substitution) !== -1) {
						file = file.replace(substitution, substitutions[substitution]);
					}
				}
			}
		}

		this._logger.debug('File built. Returning file.');
		return file;

	}

	/**
	 * Returns an array of the files included in this build
	 * @returns {string[]} Returns the array of included files for this build
	 */
	public getInclusions(): string[] {
		return this._includedFiles;
	}

	/**
	 * This function coordinates the building of all of the files, it fetches each sub-file
	 *   and adds it to the final file to be returned to the user.
	 * @param parsedURL the URL and all of its elements
	 * @param extension The extension for the file requested
	 * @param min Whether or not the file is to be minified
	 * @param parsedDetails An array of the Details interface for returning the details of a build
	 * @param includesList The list of files that are to be included in the build
	 */
	private async _build(
		parsedURL: string[],
		extension: string,
		min: boolean,
		parsedDetails: IDetails[],
		includesList: IIncludes
	): Promise<string | boolean | number> {
		// Assigns _build message from the config file to a variable which will be appended to the top of the file
		let fileContent: string = this._config.headerContent;

		// Set minify to the correct value dependant on parameters
		let minify: string = min ? '.min' : '';

		// Folders are not prefixed by a '.', therefore if there is one included in the type ignore it
		let folder: string = extension.replace('.', '');

		// Work through URL adding all of the files for each element
		for (let i = 0; i < parsedURL.length - 1; i++) {
			// Create arrays of both the keys and values from the includesList
			let includesKeys: string[] = Object.keys(includesList);
			let includesValues: string[] = Object.values(includesList);
			let updateFile: string[] = [];

			if (parsedDetails[i].fileNameMap !== undefined && parsedDetails[i].fileNameMap.get(folder) !== undefined) {
				let fileNameArray: string[] = parsedDetails[i].fileNameMap.get(folder);

				// Replace Macros defined in includes with the corresponding value
				for (let name of fileNameArray) {
					let updatestring: string = name;

					for (let l = 0; l < includesKeys.length; l++) {
						updatestring = updatestring.replace('{' + includesKeys[l] + '}', includesValues[l]);
					}

					updatestring = updatestring.replace('{version}', parsedDetails[i].version);
					updateFile.push(updatestring);
				}

				parsedDetails[i].fileNameMap.set(folder, updateFile);
				fileNameArray = parsedDetails[i].fileNameMap.get(folder);

				for (let filename of fileNameArray) {

					// Append the minify and type to the filename
					filename += minify + extension;

					// Create path based on order of the element
					let path: string = this._config.packagesDir + parsedDetails[i].folderName +
						'-' + parsedDetails[i].version +  '/' + filename;

					this._logger.debug('Fetching sub-file');
					// Get the new bit of file
					let fileAddition = await this._fetchFile(path);

					// If '500' is returned then a server error has occured so return false
					if (typeof fileAddition === 'number') {
						return fileAddition;
					}
					else if (fileAddition !== false) {
						// Add the new addition to the final file
						fileContent += fileAddition;
					}
					else {
						return false;
					}
				}
			}
		}

		// Return the finished product
		return fileContent;
	}

	/**
	 * This function fetches the sub files from the cache or the dist folder
	 * @param filename The path to the next sub file to be found
	 */
	private async _fetchFile(filename: string): Promise <string | boolean | number> {
		// Try to find the file and return it, if it's not found then return an empty string,
		// If an error occurs return '500' and log it.
		try {
			let fromCache = this._storedFiles.searchCache(filename);

			if (await fileExists(filename) && !fromCache) {
				this._logger.debug('File not in Cache, but found in directory: ' + filename);
				let content = await fileExists(filename) + '\n\n';
				this._storedFiles.updateCache(filename, content.toString());
				this._includedFiles.push(filename);
				return content;
			}
			else if (typeof fromCache === 'string') {
				this._logger.debug('File found in cache: ' + filename);
				this._storedFiles.updateCache(filename, fromCache);
				this._includedFiles.push(filename.replace(this._config.packagesDir, ''));
				return fromCache;
			}
			else {
				this._logger.warn('File not found in cache or directory');
				this._storedFiles.updateCache(filename, '');
				return '';
			}
		}
		catch (error) {
			if (filename.indexOf('?') !== -1){
				this._logger.warn('Unable to fetch optional file, may not exist: ' + filename.split('?')[1]);
				this._storedFiles.updateCache(filename, '');
				return '';
			}
			else {
				this._logger.error('Unable to fetch non option file' + filename);
				return 404;
			}
		}
	}

}
