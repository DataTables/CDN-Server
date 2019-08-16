import * as fs from 'fs';
import * as cmp from 'semver-compare';
import { IConfig } from './config';

/**
 * This class will validate that the URL given is a valid build path.
 */
export default class URLValidate {
	private _config;

	private _excludes = [];

	private _logger;
	/**
	 * Assigns the config property for this class
	 * @param configIn The config object whose standards are to be met
	 */
	constructor(configIn: IConfig, logger) {
		this._config = configIn;
		this._logger = logger;
	}

	/**
	 * Splits the inputURL into its individual elements and validates the URL
	 * @param inputURL The URL which was recieved from the HTTP request
	 * @returns {boolean} Returns a boolean value indicating if the URL is valid
	 */
	public parseURL(inputURL: string): boolean {
		// split URL into useful elements
		let parsedURL = inputURL.split('/');

		// The last element should be a valid file name, so assign it to filename and validate.
		let filename: string = parsedURL.pop();
		if (!this._validateFilename(filename)) {
			this._logger.error('Invalid filename in request: ' + filename);
			return false;
		}
		this._logger.debug('Valid filename in request.');
		// Validate the remainder of the URL
		return this._validateURL(parsedURL);
	}

	/**
	 * Finds the latest version for each of the elements in the inputURL and assembles the most up to date versions
	 * @param inputURL The URL of which the latest versions are to be found for
	 * @returns {boolean | string} returns either the valid filename or a boolean value indicating a fail
	 */
	public validateLatest(inputURL: string): boolean | string {
		this._logger('Validating URL for latest request');
		let parsedURL: string[];

		parsedURL = inputURL.split('/');
		let orderList = this._config.requires.slice();

		// Confirm that the all of the orders are present.
		for (let element of this._config.elements) {
			if (parsedURL[0] === element.abbr && orderList.indexOf(element.order) !== -1) {
				orderList.splice(orderList.indexOf(element.order), 1);

				if (orderList.length === 0) {
					break;
				}
			}
		}

		if (orderList.length > 0) {
			this._logger.error('Not all required orders included in request. Orders still to be included: ' + orderList);
			return false;
		}
		this._logger.debug('All required orders present.');

		// Confirm that the URL only contains valid abbreviations.
		for (let i = 1; i < parsedURL.length; i++) {
			if (!this._validateAbbreviation(parsedURL[i])) {
				this._logger.debug('Invalid Abbreviation included in request: ' + parsedURL[i]);
				return false;
			}

			parsedURL[i] += '-';
		}
		this._logger.debug('Abbreviations are valid');

		// Generate the necessary URL by finding all of the latest versions.
		let filename: string = '';

		for (let i = 0; i < parsedURL.length; i++) {
			parsedURL[i] += this._findLatestVersion(parsedURL[i]);
			filename += parsedURL[i] + '/';
		}

		// Validate the generated URL to make sure that it is legal.
		if (this._validateURL(parsedURL)) {
			this._logger.debug('Generated URL to be requested is legal');
			return filename;
		}

		this._logger.error('Generated URL to be requested is illegal :/');
		return false;
	}

	/**
	 * Finds the latest version of a module according to the config file
	 * @param mod the abbreviation of the module of which the latest element is to be found
	 * @returns {string} the latest version for that element
	 */
	private _findLatestVersion(mod: string): string {
		// Sort the versions for the element using the library and return the biggest one.
		for (let element of this._config.elements) {
			if (mod === element.abbr) {
				let versions = element.versions.sort(cmp);
				return versions[versions.length - 1];
			}
		}
	}

	/**
	 * @param parsedURL The Elements of the original URL which have been broken down by '/'
	 * @returns {boolean} returns a boolean value indicating whether the abbreviation requested is valid
	 */
	private _validateAbbreviation(parsedURL: string): boolean {
		// Scan all of the modules to find the abbreviation.
	   for (let element of this._config.elements) {
		   if (parsedURL === element.abbr.split('-')[0]) {
			   return true;
		   }
	   }

	   return false;
   }

	/**
	 * Validates that the requested filename is valid according to a regex.
	 * @param filename the filename of the file to be built
	 * @returns {boolean} returns a boolean value indicating whether the filename requested is valid.
	 */
	private _validateFilename(filename: string): boolean {
		// Validate that the ending of the URL is valid
		if (Object.values(this._config.fileNames).indexOf('') !== -1) {
			this._logger.warn('Empty filename in config - not allowed');
			return false;
		}
		else if (filename.search(new RegExp('(' + this._config.fileNames.join('|') + ')(\.min)?\.(js|css)$')) < 0) {
			return false;
		}

		return true;
	}

	/**
	 * Validates the URL's order, requirements and other specifications
	 * @param parsedURL The Elements of the original URL which have been broken down by '/'
	 * @returns {boolean} returns a boolean value indicating if the URL has passed validation
	 */
	private _validateURL(parsedURL: string[]): boolean {
		this._logger.debug('Validating URL');
		// if the URL started with a '/' then element 0 will be empty so remove it
		if (parsedURL[0] === '') {
			parsedURL.splice(0, 1);
		}

		for (let element of parsedURL) {
			if (element === '') {
				this._logger.error('Empty element included in URL, all elements must contain a module');
				return false;
			}
			else if (element.indexOf('..') !== -1) {
				this._logger.warn('No ".." allowed in filename');
				return false;
			}
		}
		this._logger.debug('All elements in URL have a module');

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
				for (let k = 1; k < str.length - 1; k++) {
					str[0] += str[k] + '-';
				}
			}
			else if (str.length > 1) {
				str[0] += '-';
			}

			orderList.push(orderMap.get(str[0]));
		}

		// validate Order, Abbreviation and requirements list.
		let requireList: number[] = this._config.requires;

		for (let j = 0; j < orderList.length; j++) {
			if (requireList.indexOf(orderList[j]) > -1) {
				requireList.splice(requireList.indexOf(orderList[j]), 1);
			}

			// Check that the elements of the URL are in the correct order
			// Order list can be undefined if an unknown element is requested from the map
			if (orderList[j] === undefined) {
				this._logger.error('Order of element not recognised.');
				return false;
			}
			else if (j > 0 && orderList[j] < orderList[j - 1]) {
				this._logger.error('URL modules are not in the correct order.');
				return false;
			}
		}
		this._logger.debug('URL modules are all in the correct order.');

		if (requireList.length > 0) {
			this._logger.error('Not all of the required Modules have been included. Still requires: ' + requireList);
			return false;
		}
		this._logger.debug('All of the required modules have been included.');

		// Validate each element has a correct version and that following elements do not include
		// any of the excludes for the current element.
		for (let element of parsedURL) {
			if (!this._validateVersion(element)) {
				this._logger.error('Invalid version requested for ' + element);
				return false;
			}
		}
		this._logger.debug('All requested versions are valid');

		for (let element of parsedURL) {
			let abbr = element.split('-') ;
			if(abbr.length > 1){
				abbr[0] += '-';
			}
			if (this._excludes.indexOf(abbr[0]) !== this._excludes.lastIndexOf(abbr[0])) {
				this._logger.error('Excluded module included in request');
				return false;
			}
		}

		this._logger.debug('Validation Success');
		return true;
	}

	/**
	 * Validates that the versions requested for each element is valid according to the config
	 * @param parsedURL The Elements of the original URL which have been broken down by '/'
	 * @returns {boolean} returns a boolean value indicating if the version requested is valid
	 */
	private _validateVersion(parsedURL: string): boolean {
		for (let element of this._config.elements) {
			// if the abbreviation of this element is included in the exclusion list dont bother with checking the versions
			if (this._excludes.indexOf(element.abbr) === -1) {
				for (let version of element.versions) {
					if (parsedURL === (element.abbr + version)) {
						this._excludes = this._excludes.concat(element.abbr, element.excludes);
						return true;
					}
				}
			}
		}

		return false;
	}

}
