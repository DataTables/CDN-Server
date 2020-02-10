import Cache from './Cache';
import { IConfig } from './config';
import * as utils from './utility-functions';

import * as fs from 'fs';
import { parse, stringify } from 'querystring';
import * as util from 'util';
import Logger from './Logger';

/**
 * This interface defines the format of the object to hold the details of all of the individual
 *   elements required to build the file.
 */
interface IDetails {
	version: string;
	folderName: string;
	fileNameMap: Map<string, string[]>;
	order: number;
}

/**
 * This interface defines the format of the Includes object used throughout the BuildFile Class.
 */
interface IIncludes {
	[key: string]: string;
}

const fileExists = util.promisify(fs.readFile);
const folderExists = util.promisify(fs.readdir);
/**
 * This class will return a file that contains all of the modules listed in the filePath.
 */
export default class BuildFile {
	private _config: IConfig;
	private _storedFiles: Cache;
	private _includedFiles: string[] = [];
	private _debug: boolean = false;
	private _logger;
	private _maps;
	private _id;

	/**
	 * The constructor initialises the cache, reads in the configuration for the
	 * CDN Server and whether it is to be run in debug mode.
	 * @param cache The current Cache of most recent files to have been requested
	 * @param configIn The configuration of the CDN Server. This includes the build
	 *   location of the files and all of their details.
	 * @param debug A boolean value to defined whether the Server is being run in debug mode.
	 */
	constructor(cache: Cache, configIn: IConfig, debug: boolean, logger, maps, id) {
		this._storedFiles = cache;
		this._config = configIn;
		this._debug = debug;
		this._logger = logger;
		this._maps = maps;
		this._id = id;
	}

	/**
	 * Fetches all of the sub files and converges them all into one final file to be returned to the user
	 * @param filePath The path of the file specified. Each element specifies a module to be included.
	 * @returns {boolean | string} Returns the file content if it is built succesfully and a boolean value
	 *   to indicate a failure.
	 */
	public async buildFile(filePath: string): Promise<boolean | string | number | Buffer> {
		this._logger.debug(this._id + ' - Starting Build File');

		// Split URL into useful chunks and remove the first element if it is empty.
		let parsedURL: string[] = filePath.split(new RegExp('[' + this._config.separators.join('') + ']'));

		// If the parsedURL's first element is and empty string then it begins with a separator,
		//   which is legal but will cause errors further on unless we remove the empty string from the array.
		//   If the URL Requested contains multiple separators at the start of the URL then this
		//   will be picked up in the Validation stage.
		if (parsedURL[0] === '') {
			parsedURL.splice(0, 1);
		}

		// Find out if the request is for a static file
		let extras: string = '';
		let extraIndex: number = -1;
		for (let staticFile of this._config.staticFileExtensions) {
			extraIndex = parsedURL[parsedURL.length - 1].indexOf(staticFile);

			if (extraIndex !== -1) {
				break;
			}
		}

		// If an static file is requested then there is a need to return only that file so do the following and return
		if (extraIndex !== -1) {
			extras = parsedURL[parsedURL.length - 1];
			let cut = utils.findStaticRequest(parsedURL, this._maps.outputOrderMap, undefined, this._logger);
			if (cut !== -1) {
				parsedURL.splice(0, cut);
			}

			// let cut = parsedURL.indexOf(extras);
			let path: string = this._config.packagesDir + parsedURL.join('/');
			this._logger.debug(this._id + ' - Checking for ' + extras + ' in cache');
			let fromCache = this._storedFiles.searchCache(path, this._id);

			if (!fromCache) {
				let content = await fileExists(path);
				return this._logUpdateReturn(extras + ' not found in cache, fetching Image from ' + path, path, content, false);
			}
			else if (Buffer.isBuffer(fromCache)) {
				return this._logUpdateReturn(extras + ' found in cache', path, fromCache, true);
			}
			else {
				return false;
			}
		}

		let cloneParsedURL: string[] = parsedURL.slice();
		cloneParsedURL.pop();
		filePath = cloneParsedURL.join('/');

		// ReOrder the URL so that the files are added together in the correct order as defined in the config
		parsedURL = this._reOrderBuild(parsedURL);

		// Grab the Folder names, File names, versions, orders and includes and add them to a list.
		let parsedDetails: IDetails[] = [];
		let includesList: IIncludes = {};
		let extensionsList: string = '';
		let extensionsListArray: string[] = [];

		this._logger.debug(this._id + ' - Retrieving relevant data for build');
		for (let i = 0; i < parsedURL.length; i++) {
			let folderName: string;
			let fileName: Map<string, string[]>;
			let vers: string;
			let order: number;
			let strParsed: string[] = parsedURL[i].split('-');

			// If the URL includes a version add a '-' to the abbreviation as in config,
			// otherwise no version is associated with this element so push an empty string
			if (strParsed.length > 1) {
				this._logger.debug(this._id + ' - Version included in module');
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
				this._logger.debug(this._id + ' - Version not included in module');
				vers = '';
			}

			order = this._maps.outputOrderMap.get(strParsed[0]);
			folderName = this._maps.folderNameMap.get(strParsed[0]);
			this._logger.debug(this._id + ' - Creating list of extensions for ' + strParsed);

			// Create the string to replace the `{extensionsList}` macro in the built file as defined in config
			if (strParsed.length > 1 && i < parsedURL.length - 1) {
				this._logger.debug(this._id + ' - Adding to extensionsList ' + this._maps.moduleNameMap.get(strParsed[0]));
				extensionsListArray.push(this._maps.moduleNameMap.get(strParsed[0]) + ' ' + strParsed[strParsed.length - 1]);
			}

			// It is necessary to create a new copy of the map that does not reference the old one otherwise
			//   changes made later will affect future builds
			fileName = this._maps.fileNameMap.get(strParsed[0]);
			let newMap = new Map<string, string[]>();

			if (fileName !== undefined) {
				let keys = Array.from(fileName.keys());
				let values = Array.from(fileName.values());

				for (let j = 0; j < keys.length; j++) {
					newMap.set(keys[j], values[j]);
				}
			}

			parsedDetails.push({
				fileNameMap: newMap,
				folderName,
				order,
				version: vers,
			});

			// If the string has styling or similar that need to be included with it
			//   then this is where they are added to the includes list.
			if (this._maps.includesMap.get(strParsed[0]) !== undefined) {
				let keys: string[] = Object.keys(this._maps.includesMap.get(strParsed[0]));
				let vals: string[] = Object.values(this._maps.includesMap.get(strParsed[0]));

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
		this._logger.debug(this._id + ' - Constructing file');

		// Call function to _build the required file
		let file = await this._build(parsedURL, type, min, parsedDetails, includesList);

		// Replace macros in the file as defined in the this._config
		if (!file) {
			this._logger.error(this._id + ' - File unable to be built');
			return false;
		}
		else if (typeof file === 'string') {
			this._logger.debug(this._id + ' - File built succesfully, replacing macros');
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

			// Find all of the matching strings in the file for the RegExp as given
			//  Then replace them with empty strings as we do not want to include them
			let sourceMapReg = new RegExp('\\/\\*# sourceMappingURL=.*\\*\\/', 'g');
			let matches = file.match(sourceMapReg);

			if (matches !== null) {
				this._logger.debug(this._id + ' - Replacing Source Maps.');

				for (let match of matches) {
					file = file.replace(match, '');
				}
			}
		}

		this._logger.debug(this._id + ' - File built. Returning file.');
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
		includesList: IIncludes,
	): Promise<string | boolean | number> {

		// Assigns _build message from the config file to a variable which will be appended to the top of the file
		let fileHeader: string = this._config.headerContent;
		let fileContent: string = '';

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

					for (let includesPoint = 0; includesPoint < includesKeys.length; includesPoint++) {
						updatestring = updatestring.replace('{' + includesKeys[includesPoint] + '}', includesValues[includesPoint]);
					}

					updatestring = updatestring.replace('{version}', parsedDetails[i].version);
					updateFile.push(updatestring);
				}

				parsedDetails[i].fileNameMap.set(folder, updateFile);

				for (let filename of updateFile) {
					// Append the minify and type to the filename
					filename += minify + extension;

					// Get the file with it's replacements in place
					let fileAddition = await this._fetchReplace(parsedDetails[i], filename, parsedURL);

					// If '500' is returned then a server error has occured so return false
					if (fileAddition !== false) {
						// Add the new addition to the final file
						fileContent += fileAddition;
					}
					else {
						return false;
					}
				}
			}
		}

		// If there is no content then the header would be returned by itself - instead return an error
		if (fileContent.length === 0) {
			this._logger.error(this._id + ' - File to be returned is empty before header');
			return false;
		}
		else {
			// Return the finished product
			return fileHeader + fileContent;
		}

	}

	/**
	 * This function fetches the sub files from the cache or the dist folder
	 * @param fileIn The path to the next sub file to be found
	 */
	private async _fetchFile(fileIn: string, folder: string, version: string): Promise<string | boolean | number> {

		// Try to find the file and return it, if it's not found then return an empty string,
		// If an error occurs return '500' and log it.
		let optional = fileIn.indexOf('?') !== -1 ? true : false;
		let filename = fileIn.split('?').join('');

		try {
			let fromCache = this._storedFiles.searchCache(filename, this._id);

			if (optional && typeof fromCache === 'string' && fromCache === '') {
				return this._logUpdateReturn('Found empty optional file in cache: ' + filename, filename, '', true);
			}
			else if (typeof fromCache === 'string') {
				this._includedFiles.push(filename.replace(this._config.packagesDir, ''));
				return this._logUpdateReturn('File found in cache: ' + filename, filename, fromCache, true);
			}
			else if (await fileExists(filename) && !fromCache) {
				let content = await fileExists(filename) + '\n\n';
				this._includedFiles.push(filename.replace(this._config.packagesDir, ''));
				return this._logUpdateReturn('File not in Cache, but found in directory: ' + filename, filename, content, false);
			}
			else {
				return this._logUpdateReturn('File not found in cache or directory', filename, '', false);
			}
		}
		catch (error) {
			if (optional) {
				this._logger.warn(this._id + ' - Unable to fetch optional file, may not exist: ' + filename);
				this._storedFiles.updateCache(filename, '', false, this._id);
				return '';
			}
			else {
				this._logger.error(this._id + ' - Unable to fetch non optional file: ' + filename);
				return false;
			}
		}
	}

	/**
	 * Fetches the file and then performs any replacements that are required
	 * @param parsedDetail The element of parsedDetails currently in question
	 * @param filename The name of the file to be fetched
	 * @param parsedURL The URL split on the separator
	 */
	private async _fetchReplace(parsedDetail, filename, parsedURL) {

		// Create path based on order of the element
		let path: string = this._config.packagesDir + parsedDetail.folderName + '-' + parsedDetail.version + '/' + filename;

		// Get the new bit of file
		this._logger.debug(this._id + ' - Fetching sub-file');
		let fileAddition = await this._fetchFile(path, parsedDetail.folderName, parsedDetail.version);

		if (!fileAddition) {
			return fileAddition;
		}

		if (filename.charAt(0) === '?') {
			let fileSplit = filename.split('?');
			filename = '';
			for (let i = 1; i < fileSplit.length; i++) {
				filename += fileSplit[i];
			}
		}

		if (filename.split('.').indexOf('css') !== -1 && typeof fileAddition === 'string') {
			let matches = fileAddition.match(/url\(.*?\)/g);

			if (matches !== null) {
				this._logger.debug(this._id + ' - Number of files found: ' + matches.length);
				let usefulURL = parsedURL.slice();
				usefulURL.pop();

				// For every match replace the string currently in the file with a
				//  new one that this CDN will understand when it recieves a request.
				for (let match of matches) {
					let original = match.match(/url\s*\(\s*([\'"]?)(.*?)[\'"]?\s*\)/);

					if (
						original !== null &&
						(match.indexOf('http://') === -1 &&
							match.indexOf('https://') === -1 &&
							match.indexOf('data:') === -1)
					) {
						let splitType = '';
						let separators = ['\'', '"', ')'];
						let splitName = filename.split('/');

						if (splitName.length > 1) {
							splitName.pop();
							splitName = splitName.join('/');
						}
						else {
							splitName = '';
						}

						let pathAddition = original[2].split(new RegExp('[' + this._config.separators.join('') + ']')).join('/');

						let url = '/' + parsedDetail.folderName
							+ '-' + parsedDetail.version
							+ '/' + splitName
							+ '/' + pathAddition;
						url = this._normalizePath(url);

						for (let split of separators) {
							let splitMatch = match.split(split);

							if (splitMatch.length > 2) {
								splitType = split;
								break;
							}
						}

						let replacement = 'url(' + splitType
							+ url
							+ splitType + ')';
						fileAddition = fileAddition.replace(match, replacement);
					}
				}
			}
		}

		return fileAddition;
	}

	/**
	 * Function to log a message, update the cache and return the content.
	 * @param logMessage The message to be logged to the debugger
	 * @param filename The name of the file being returned
	 * @param returnContent The content of the file being returned
	 * @param refresh whether the cache is to be refreshed.
	 */
	private _logUpdateReturn(logMessage: string, filename: string, returnContent, refresh) {
		this._logger.debug(this._id + ' - ' + logMessage);
		this._storedFiles.updateCache(filename, returnContent, refresh, this._id);
		return returnContent;
	}

	/**
	 * Takes a url and removes useless elements and shortens
	 * @param url url which is to be normalized
	 */
	private _normalizePath(url: string): string {
		let parsedURL: string[] = url.split('/');
		let index: number;

		index = parsedURL.indexOf('');
		while (index !== -1) {
			parsedURL.splice(index, 1);
			index = parsedURL.indexOf('');
		}
		index = parsedURL.indexOf('.');
		while (index !== -1) {
			parsedURL.splice(index, 1);
			index = parsedURL.indexOf('.');
		}
		index = parsedURL.indexOf('..');
		while (index !== -1) {
			parsedURL.splice(index - 1, 2);
			index = parsedURL.indexOf('..');
			if (index === 0) {
				break;
			}
		}
		url = '/' + parsedURL.join('/');
		return url;
	}

	/**
	 * The URL elements come in in a different order to that which they are to be built.
	 * This function reorders them so that they are corrected.
	 * @param parsedURL The Input URL that is to be reordered for building
	 */
	private _reOrderBuild(parsedURL: string[]) {
		let filename: string = parsedURL.pop();
		let originalURL: string[] = parsedURL.slice();

		// Sort the array based on the buildOrders of the elements
		parsedURL.sort((a, b) => {
			let abbrA: string[] = a.split('-');
			let abbrB: string[] = b.split('-');

			let abA: string;
			let abB: string;

			abA = abbrA.length > 1 ? abbrA[0] + '-' : abbrA[0];
			abB = abbrB.length > -1 ? abbrB[0] + '-' : abbrB[0];

			let ordA = this._maps.outputOrderMap.get(abA);
			let ordB = this._maps.outputOrderMap.get(abB);
			if (ordA > ordB) {
				return 1;
			}
			else if (ordA < ordB) {
				return -1;
			}
			else if (originalURL.indexOf(a) < originalURL.indexOf(b)) {
				return -1;
			}
			else if (originalURL.indexOf(a) > originalURL.indexOf(b)) {
				return 1;
			}
			else {
				return 0;
			}
		});
		parsedURL.push(filename);
		return parsedURL;
	}

}
