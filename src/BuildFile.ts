import Cache from './Cache';

import * as fs from 'fs';
import * as util from 'util';

/**
 * This class will return a file that contains all of the modules listed in the filePath.
 */
export default class BuildFile {

	private config;
	private storedFiles: Cache;
	private includedFiles: string[] = [];
	constructor(cache: Cache, configIn) {
		this.storedFiles = cache;
		this.config = configIn;
	}

	public async buildFile(filePath: string) {
		// Split URL into useful chunks and remove the first element if it is empty.
		let parsedURL: string[] = filePath.split('/');

		if (parsedURL[0] === '') {
			parsedURL.splice(0, 1);
		}

		// Create a mapping between the URL Abbreviations, folder names, file names, order and includes
		let folderNameMap = new Map < string, string > ();

		// FileNameMap maps the abbreviation to a map of the file type(js,css,etc...) to an array of the files to be built
		let fileNameMap = new Map<string, Map<string, string[]>>();
		let orderMap = new Map < string, number > ();
		let includesMap = new Map < string, {} > ();

		for (let element of this.config.elements) {
			let fileKeys: string[] = Object.keys(element.fileNames);
			let fileValues: string[][] = Object.values(element.fileNames);

			// This is the map between the file type and the array of files to be built
			let tempMap = new Map <string, string[]>();

			for (let j = 0; j < fileKeys.length; j++) {
				tempMap.set(fileKeys[j], fileValues[j]);
			}

			folderNameMap.set(element.abbr, element.folderName);
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
		let folderNameList: string[] = [];
		let fileNameList: Array < Map < string, string [] > > = [];
		let versionList: string[] = [];
		let orderList: number[] = [];
		let extensionsList: string = '';
		let includesList: {
			[key: string]: string
		} = {};

		let start: number = 0;
		for (let i = 0; i < parsedURL.length; i++) {
			let str: string[] = parsedURL[i].split('-');
			// If the URL includes a version add a '-' to the abbreviation as in config,
			// otherwise no version is associated with this element so push an empty string
			if (str.length > 1) {
				str[0] += '-';
				versionList.push(str[str.length - 1]);
			}
			else {
				start = 1;
				versionList.push('');
			}

			// If the URL splits to 3 or more it must be a Sub-Extension, so add the second part of the abbreviation
			if (str.length > 2) {
				for (let j = 1; j < str.length - 1; j++) {
					str[0] = str[0] += str[j];
					str[0] += '-';
				}
			}

			orderList.push(orderMap.get(str[0]));
			folderNameList.push(folderNameMap.get(str[0]));

			// Create the string to replace the macro in the built file as defined in config
			if (i > 0 && i < parsedURL.length - 1) {
				if (i > 1) {
					extensionsList += ',';
				}
				extensionsList += ' ' + folderNameMap.get(str[0]) + ' ' + str[str.length - 1];
			}

			if (fileNameMap.get(str[0]) !== undefined) {
				fileNameList.push(fileNameMap.get(str[0]));
			}
			else {
				fileNameList.push(null);
			}

			if (includesMap.get(str[0]) !== undefined) {
				let keys: string[] = Object.keys(includesMap.get(str[0]));
				let vals: string[] = Object.values(includesMap.get(str[0]));
				for (let j = 0; j < keys.length; j++) {
					includesList[keys[j]] = vals[j];
				}
			}
		}

		// From the file name, identify filetype, and whether the minified version is to be built
		let splitFileName: string[] = parsedURL[parsedURL.length - 1].split('.');
		let file;
		let type: string = '.' + splitFileName[splitFileName.length - 1];
		let min: boolean = false;

		if (splitFileName.length > 2) {
			min = true;
		}

		// Call function to build the required file
		file = await this.build(parsedURL, type, min, folderNameList, fileNameList, versionList, includesList, start);
		// Replace macros in the file as defined in the this.config
		if (!file) {
			return false;
		}
		else {
			file = file.replace(this.config.substitutions.extensionsURL, filePath);
			file = file.replace(this.config.substitutions.extensionsList, extensionsList);
		}

		return file;

	}

	public async getInclusions() {
		return this.includedFiles;
	}

	private async fetchFile(filename: string) {
		// Try to find the file and return it, if it's not found then return an empty string,
		// If an error occurs return '500' and log it.
		try {
			let inCache = this.storedFiles.searchCache(filename);
			if (await util.promisify(fs.exists)(filename) && !inCache) {
				// console.log('found:', filename);
				let content = await util.promisify(fs.readFile)(filename);
				this.storedFiles.updateCache(filename, content.toString());
				this.includedFiles.push(filename);
				return content;
			}
			else if (!inCache) {
				// console.log('not found:', filename);
				this.storedFiles.updateCache(filename, '');
				return '';
			}
			else {
				this.storedFiles.updateCache(filename, inCache);
				this.includedFiles.push(filename.replace(this.config.buildLocation, ''));
				return inCache;
			}
		}
		catch (error) {
			return '500';
		}
	}

	private async build(
		parsedURL: string[],
		type: string,
		min: boolean,
		folderNameList: string[],
		fileNameList: Array < Map < string, string[] >> ,
		versionList: string[],
		includesList: { [key: string]: string },
		start: number
		) {
		// Add build message from the config file to the top of the file
		let fileContent: string = this.config.buildMessage;

		// Set minify to the correct value dependant on parameters
		let minify: string = '';

		if (min) {
			minify = '.min';
		}

		// Folders are not prefixed by a '.', therefore if there is one included in the type ignore it
		let folderType: string[] = type.split('.');
		let folder: string = folderType[folderType.length - 1];

		// Work through URL adding all of the files for each element
		for (let i = start; i < parsedURL.length - 1; i++) {

			// Create arrays of both the keys and values from the includesList
			let includesKeys: string[] = Object.keys(includesList);
			let includesValues: string[] = Object.values(includesList);

			let updateFile: string[] = [];
			if (fileNameList[i] !== null && fileNameList[i].get(folder) !== undefined) {
				let fileNameArray: string[] = fileNameList[i].get(folder);

				// Replace Macros defined in includes with the corresponding value
				for (let name of fileNameArray) {
					let updatestring: string = name;
					for (let l = 0; l < includesKeys.length; l++) {
						updatestring = updatestring.replace('{' + includesKeys[l] + '}', includesValues[l]);
					}
					updatestring = updatestring.replace('{version}', versionList[i]);
					updateFile.push(updatestring);
				}

				fileNameList[i].set(folder, updateFile);
				fileNameArray = fileNameList[i].get(folder);
				for (let j = 0; j < fileNameList[i].get(folder).length; j++) {

					// Append the minify and type to the filename
					let filename: string = fileNameArray[j] + minify + type;

					// Create path based on order of the element
					let path: string = this.config.buildLocation + folderNameList[i] + '-' + versionList[i] +  '/' + filename;

					// Get the new bit of file
					let fileAddition = await this.fetchFile(path);

					// If '500' is returned then a server error has occured so return false
					if (fileAddition === '500') {
						return false;
					}

					// Add the new addition to the final file
					fileContent += fileAddition;
				}
			}
		}
		// Return the finished product
		return fileContent;
	}

}
