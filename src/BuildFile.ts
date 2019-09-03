import Cache from './Cache';
import {IConfig} from './config';

import * as fs from 'fs';
import { parse } from 'querystring';
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
	public async buildFile(filePath: string): Promise<boolean | string | number | Buffer> {
		this._logger.debug('Starting Build File');

		// Split URL into useful chunks and remove the first element if it is empty.
		let parsedURL = filePath.split(new RegExp('[' + this._config.separators.join('') + ']'));

		// If the parsedURL's first element is and empty string then it begins with a separator,
		//   which is legal but will cause errors further on unless we remove the empty string from the array.
		//   If the URL Requested contains multiple separators at the start of the URL then this
		//   will be picked up in the Validation stage.
		if (parsedURL[0] === '') {
			parsedURL.splice(0, 1);
		}

		// Find out if the request is for a static file
		let extras = '';
		let extraIndex = -1;
		for (let staticFile of this._config.staticFileExtensions) {
			extraIndex = parsedURL[parsedURL.length - 1].indexOf(staticFile);

			if (extraIndex !== -1) {
				break;
			}
		}

		// If an static file is requested then there is a need to return only that file so do the following and return
		if (extraIndex !== -1) {
			extras = parsedURL[parsedURL.length - 1];
			let cut = this._findCut(parsedURL);

			if (typeof cut === 'number') {
				parsedURL.splice(0, cut);
			}

			// let cut = parsedURL.indexOf(extras);
			let path = this._config.packagesDir + parsedURL.join('/');
			this._logger.warn(path);
			this._logger.debug('Checking for ' + extras + ' in cache');
			let fromCache = this._storedFiles.searchCache(path);

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

		let cloneParsedURL = parsedURL.slice();
		cloneParsedURL.pop();
		filePath = cloneParsedURL.join('/');

		// ReOrder the URL so that the files are added together in the correct order as defined in the config
		parsedURL = this._reOrderBuild(parsedURL);

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
		else if (typeof file === 'number') {
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

			// Find all of the matching strings in the file for the RegExp as given
			//  Then replace them with empty strings as we do not want to include them
			let sourceMapReg = new RegExp('\\/\\*# sourceMappingURL=.*\\*\\/', 'g');
			let matches = file.match(sourceMapReg);

			if (matches !== null) {
				this._logger.debug('Replacing Source Maps.');

				for (let match of matches) {
					file = file.replace(match, '');
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
		includesList: IIncludes,
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
	 * @param fileIn The path to the next sub file to be found
	 */
	private async _fetchFile(fileIn: string, folder: string, version: string): Promise <string | boolean | number> {

		// Try to find the file and return it, if it's not found then return an empty string,
		// If an error occurs return '500' and log it.
		let optional = fileIn.indexOf('?') !== -1 ? true : false;
		let filename = fileIn.split('?').join('');

		try {
			let fromCache = this._storedFiles.searchCache(filename);

			if (optional && typeof fromCache === 'string' && fromCache === '') {
				return this._logUpdateReturn('Found empty optional file in cache: ' + filename, filename, '', true);
			}
			else if (typeof fromCache === 'string') {
				this._includedFiles.push(filename.replace(this._config.packagesDir, ''));
				return this._logUpdateReturn('File found in cache: ' + filename, filename, fromCache, true);
			}
			else if (await fileExists(filename) && !fromCache) {
				let content = await fileExists(filename) + '\n\n';
				this._includedFiles.push(filename);
				return this._logUpdateReturn('File not in Cache, but found in directory: ' + filename, filename, content, false);
			}
			else {
				return this._logUpdateReturn('File not found in cache or directory', filename, '', false);
			}
		}
		catch (error) {

			if (optional) {
				this._logger.warn('Unable to fetch optional file, may not exist: ' + filename);
				this._storedFiles.updateCache(filename, '', false);
				return '';
			}
			else {
				this._logger.error('Unable to fetch non option file' + filename);
				return 404;
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
		let path: string = this._config.packagesDir + parsedDetail.folderName + '-' + parsedDetail.version +  '/' + filename;

		// Get the new bit of file
		this._logger.debug('Fetching sub-file');
		let fileAddition = await this._fetchFile(path, parsedDetail.folderName, parsedDetail.version);

		// Split the filename used to find the file into useful chunks
		let splitFileName = path.split('/');
		let cutLoc = splitFileName.indexOf(parsedDetail.folderName + '-' + parsedDetail.version) - 1;

		let fileList;
		let folderList;
		let filePathList = [];

		// If the folder and version combination is found in the filename
		if (cutLoc > -1) {
			this._logger.debug('Searching for static folder' /*extra*/);

			// Work out how many chunks to remove from the end
			let tail = splitFileName.length - cutLoc - 1;
			splitFileName.splice(cutLoc + 2, tail);

			// Put the useful ones back together and make the path up for the image location
			let folderPath = splitFileName.join('/')  + '/'; /*+ extra + '/'*/
			this._logger.debug('checking if folder exists: ' + folderPath);

			// Try and find the folder and if it exists extract a list of files within it
			try {
				folderList = await folderExists(folderPath);
				this._logger.debug('Folders found');
				this._logger.warn(folderList);

				for (let folder of folderList) {
					let subFolderPath = folderPath + folder + '/';
					try{
						fileList = await folderExists(subFolderPath);
					}
					catch {
						this._logger.warn(subFolderPath + ' is not a folder')
						continue;
					}
					let subfilePathList = [];

					// make a list of all of the files in the folder
					for (let file of fileList) {
						for (let extn of this._config.staticFileExtensions) {
							if (file.indexOf(extn) !== -1) {
								subfilePathList.push(subFolderPath + file);
								break;
							}
						}
					}

					filePathList.push({folder, fileList, subfilePathList});
				}
			}
			catch {
				this._logger.warn('Folder not found');
			}
		}

		for (let staticFile of filePathList) {
			// If the folder was found and fetching the file has not resulted in an error
			if (staticFile.fileList !== undefined && staticFile.subfilePathList.length > 0 && typeof fileAddition === 'string') {
				let matches = fileAddition.match(/url\(.*?\)/g);

				if (matches !== null) {
					this._logger.debug('Number of files found: ' + matches.length);
					let usefulURL = parsedURL.slice();
					usefulURL.pop();

					// For every match replace the string currently in the file with a
					//  new one that this CDN will understand when it recieves a request.
					for (let match of matches) {
						let splitType = '';
						let separators = ['\'', '"', ')'];

						for (let split of separators) {
							let splitMatch = match.split(split);

							if (splitMatch.length > 2) {
								splitType = split;
								break;
							}
						}

						let original = match.match(/url\s*\(\s*([\'"]?)(.*?)[\'"]?\s*\)/);
						if (
							original !== null &&
							(match.indexOf('http://') === -1 &&
								match.indexOf('https://') === -1 &&
								match.indexOf('data:') === -1)
						) {
							let splitName = filename.split('/');

							if (splitName.length > 1) {
								splitName.pop();
								splitName = splitName.join('/');
							}
							else {
								splitName = '';
							}

							let url = parsedDetail.folderName
							+ '-' + parsedDetail.version
							+ '/' + splitName
							+ '/' + original[2];

							url = this._normalizePath(url);

							let replacement = 'url(' + splitType
							+ url
							+ splitType +  ')';

							// match = original[0].replace(original[2], replacement);
							fileAddition = fileAddition.replace(match, replacement);
						}
					}
				}
			}
		}

		return fileAddition;
	}

	/**
	 * Finds the point at which the static request begins
	 * @param parsedURL the inputURL of which the cut point is to be found
	 */
	private _findCut(parsedURL): number | boolean {
		// declare an order map, mapping the abbreviation of each element to its order
		let orderMap = new Map<string, number>();

		for (let element of this._config.elements) {
			orderMap.set(element.abbr, element.order);
		}

		// iterate through the URL and extract the order for each element, adding to orderList
		let orderList: number[] = [];

		for (let element of parsedURL) {
			let str: string[] = element.split('-');
			if (str.length > 2) {
				str[0] += '-';
				for (let k = 1; k < str.length - 1; k++) {
					str[0] += str[k] + '-';
				}
			}
			else if (str.length > 1) {
				str[0] += '-';
			}
			orderList.push(orderMap.get(str[0]));
		}

		for (let j = 0; j < orderList.length; j++) {

			// Check that the elements of the URL are in the correct order
			// Order list can be undefined if an unknown element is requested from the map
			if (orderList[j] === undefined) {
				return j;
			}
		}

		this._logger.debug('URL modules are all in the correct order.');
		return false;
	}

	/**
	 * Function to log a message, update the cache and return the content.
	 * @param logMessage The message to be logged to the debugger
	 * @param filename The name of the file being returned
	 * @param returnContent The content of the file being returned
	 * @param refresh whether the cache is to be refreshed.
	 */
	private _logUpdateReturn(logMessage: string, filename, returnContent, refresh) {
		this._logger.debug(logMessage);
		this._storedFiles.updateCache(filename, returnContent, refresh);
		return returnContent;
	}

	/**
	 * Takes a url and removes useless elements and shortens
	 * @param url url which is to be normalized
	 */
	private _normalizePath(url): string {
		let parsedURL = url.split('/');
		let emptyIndex = parsedURL.indexOf('');
		while (emptyIndex !== -1) {
			parsedURL.splice(emptyIndex, 1);
			emptyIndex = parsedURL.indexOf('');
		}
		let thisIndex = parsedURL.indexOf('.');
		while (thisIndex !== -1) {
			parsedURL.splice(thisIndex, 1);
			thisIndex = parsedURL.indexOf('.');
		}
		let prevIndex = parsedURL.indexOf('..');
		while (prevIndex !== -1) {
			parsedURL.splice(prevIndex - 1, 2);
			prevIndex = parsedURL.indexOf('..');
			if (prevIndex === 0) {
		 		break;
		 	}
		}
		url = parsedURL.join('/');
		return url;
	}

	/**
	 * The URL elements come in in a different order to that which they are to be built.
	 * This function reorders them so that they are corrected.
	 * @param parsedURL The Input URL that is to be reordered for building
	 */
	private _reOrderBuild(parsedURL) {

		// Define and add all of the build Orders to a map
		let buildOrderMap = new Map<string, number>();
		for (let element of this._config.elements) {
			buildOrderMap.set(element.abbr, element.buildOrder);
		}
		let filename = parsedURL.pop();

		let originalURL = parsedURL.slice();

		// Sort the array based on the buildOrders of the elements
		parsedURL.sort(function(a, b) {
			let abbrA = a.split('-');
			let abbrB = b.split('-');

			abbrA = abbrA.length > 1 ?
				abbrA = abbrA[0] + '-' :
				abbrA = abbrA[0];

			abbrB = abbrB.length > -1 ?
				abbrB = abbrB[0] + '-' :
				abbrB = abbrB[0];

			let ordA = buildOrderMap.get(abbrA);
			let ordB = buildOrderMap.get(abbrB);

			if (ordA > ordB) {
				return 1;
			}
			else if (ordA < ordB) {
				return -1;
			}
			else if (originalURL.indexOf(a) < originalURL.indexOf(b)) {
				return 1;
			}
			else if (originalURL.indexOf(a) > originalURL.indexOf(b)) {
				return -1;
			}
			else {
				return 0;
			}
		});
		parsedURL.push(filename);
		return parsedURL;
	}

}
