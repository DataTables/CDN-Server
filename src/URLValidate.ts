import * as fs from 'fs';
import * as cmp from 'semver-compare';
import { IConfig } from './config';

import * as utils from './utility-functions';

import * as util from 'util';

const fileExists = util.promisify(fs.readFile);

/**
 * This class will validate that the URL given is a valid build path.
 */
export default class URLValidate {
	private _config;
	private _excludes = [];
	private _logger;
	private _maps;

	/**
	 * Assigns the config property for this class
	 * @param configIn The config object whose standards are to be met
	 */
	constructor(configIn: IConfig, logger, maps) {
		this._config = configIn;
		this._logger = logger;
		this._maps = maps;
	}

	/**
	 * Splits the inputURL into its individual elements and validates the URL
	 * @param inputURL The URL which was recieved from the HTTP request
	 * @returns {boolean} Returns a boolean value indicating if the URL is valid
	 */
	public async parseURL(inputURL: string): Promise<boolean> {
		// split URL into useful elements

		let parsedURL = inputURL.split(new RegExp('[' + this._config.separators.join('') + ']'));

		// The last element should be a valid file name, so assign it to filename and validate.
		let filename: string = parsedURL.pop();
		if (!this._validateFilename(filename)) {
			this._logger.error('Invalid filename in request: ' + filename);
			return false;
		}
		this._logger.debug('Valid filename in request: ' + filename);
		this._logger.warn(parsedURL);
		if (this._config.selectHack) {
			parsedURL = this.hackSelect(parsedURL);
		}
		this._logger.warn(parsedURL);

		// Validate the remainder of the URL
		return await this._validateURL(parsedURL, filename);
	}

	/**
	 * Finds the latest version for each of the elements in the inputURL and assembles the most up to date versions
	 * @param inputURL The URL of which the latest versions are to be found for
	 * @returns {boolean | string} returns either the valid filename or a boolean value indicating a fail
	 */
	public async validateLatest(inputURL: string, skipValidation: boolean): Promise<boolean | string> {
		this._logger.debug('Entering validateLatest: [' + inputURL + ']');

		this._logger.debug('Validating URL for latest request');
		let parsedURL: string[];
		parsedURL = inputURL.split(new RegExp('[' + this._config.separators.join('') + ']'));
		if (utils.findStaticRequest(parsedURL, this._maps.outputOrderMap, this._config.requires, this._logger) !== -1) {
			return false;
		}

		// Confirm that the URL only contains valid abbreviations.
		for (let i = 1; i < parsedURL.length; i++) {
			if (!this._validateAbbreviation(parsedURL[i])) {
				this._logger.debug('Invalid Abbreviation included in request: ' + parsedURL[i]);
				return false;
			}
		}
		this._logger.debug('Abbreviations are valid');

		// Generate the necessary URL by finding all of the latest versions.
		let filename: string = '';

		for (let i = 0; i < parsedURL.length; i++) {
			parsedURL[i] += this._findLatestVersion(parsedURL[i]);
			filename += parsedURL[i] + '/';
		}

		// Validate the generated URL to make sure that it is legal.
		if (skipValidation || await this._validateURL(parsedURL, filename)) {
			this._logger.debug('Generated URL to be requested is legal');
			return filename;
		}

		this._logger.error('Generated URL to be requested is illegal :/');
		return false;
	}

	public hackSelect(parsedURL): string[] {
		this._logger.warn('Hacking Select abbreviation');
		for (let i = 1; i < parsedURL.length; i++) {
			let split = parsedURL[i].split('-');
			if (split.length > 1 && split[0] === 'se') {
				this._logger.debug('select found after first element, changing ' + parsedURL[i] + ' to sl-' + split[1]);
				parsedURL[i] = 'sl-' + split[1];
			}
		}
		this._logger.warn(parsedURL.join('/'));
		return parsedURL;
	}

	/**
	 * Return last version as already sorted
	 * @param mod the abbreviation of the module of which the latest element is to be found
	 * @returns {string} the latest version for that element
	 */
	private _findLatestVersion(mod: string): string {
		this._logger.debug('Entering _findLatestVersion: [' + mod + ']');

		for (let element of this._config.elements) {
			if (mod === element.abbr) {
				if (element.versions.length > 0) {
					return element.versions[element.versions.length - 1];
				}
				else {
					return '';
				}
			}
		}
	}

	/**
	 * @param parsedURL The Elements of the original URL which have been broken down by separators
	 * @returns {boolean} returns a boolean value indicating whether the abbreviation requested is valid
	 */
	private _validateAbbreviation(parsedURL: string): boolean {
		// Scan all of the modules to find the abbreviation.
		for (let element of this._config.elements) {
			if (parsedURL === element.abbr) {
				return true;
			}
		}

		return false;
	}

	/**
	 * validates that the static request is legal
	 * @param parsedURL the URL which is to be validated for a static file request
	 * @param filename the name of the file requested
	 */
	private async _validateExtraRequest(parsedURL: string[], filename: string) {
		this._logger.debug('Entering _validateExtraRequest: [' + parsedURL + '], [' + filename + ']');

		// Find the point in the requested URL that images is and remove all of the preceeding elementsk
		// bar one as this should be the folder name. Then construct the path to the file.
		if (parsedURL[0] === '') {
			parsedURL.splice(0, 1);
		}

		let cut = utils.findStaticRequest(parsedURL, this._maps.outputOrderMap, undefined, this._logger);
		if (cut === -1) {
			this._logger.error('Not a valid static request');
			return false;
		}

		parsedURL.splice(0, cut);
		let path = this._config.packagesDir + parsedURL.join('/') + '/' + filename;
		try {
			if (await fileExists(path)) {
				this._logger.debug(filename + ' found at ' + path);
				return true;
			}
			else {
				this._logger.error(filename + ' not found at ' + path);
				return false;
			}
		}
		catch {
			this._logger.error('Error finding ' + path);
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
		else if (filename.search(new RegExp(this._config.staticFileExtensions.join('|\\') + '$')) > 0 &&
			this._config.staticFileExtensions.length > 0) {
			return true;
		}
		else if (
			filename.search(
				new RegExp('(' + this._config.fileNames.join('|') + ')(\\' + this._config.fileExtensions.join('|\\') + ')$')
			) < 0
		) {
			return false;
		}

		return true;
	}

	/**
	 * validates that the standard request is legal
	 * @param parsedURL the URL which is to be validated for a normal file request
	 */
	private _validateFileRequest(parsedURL: string[]): boolean {
		this._logger.debug('Entering _validateFileRequest: [' + parsedURL + ']');

		// if the URL started with a separator then element 0 will be empty so remove it
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

		if (utils.findStaticRequest(parsedURL, this._maps.outputOrderMap, this._config.requires, this._logger) !== -1) {
			return false;
		}

		// Validate each element has a correct version and that following elements do not include
		// any of the excludes for the current element.
		for (let element of parsedURL) {
			if (!this._validateVersion(element)) {
				this._logger.error('Invalid version requested for ' + element);
				return false;
			}
		}
		this._logger.debug('All requested versions are valid');

		// Validate that none of the elements have been excluded except themselves
		for (let element of parsedURL) {
			let abbr = element.split('-');
			if (abbr.length > 1) {
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
	 * Validates the URL's order, requirements and other specifications
	 * @param parsedURL The Elements of the original URL which have been broken down by separators
	 * @returns {boolean} returns a boolean value indicating if the URL has passed validation
	 */
	private async _validateURL(parsedURL: string[], filename: string): Promise<boolean> {
		this._logger.debug('Validating URL');
		let staticIndex = -1;
		for (let staticExtension of this._config.staticFileExtensions) {
			staticIndex = filename.indexOf(staticExtension);
			if (staticIndex !== -1) {
				break;
			}
		}
		// If there is then an image request has to be validated, otherwise validate a file request
		if (staticIndex !== -1) {
			this._logger.debug('Validating Static Request');
			return await this._validateExtraRequest(parsedURL, filename);
		}
		else {
			this._logger.debug('Validating File Request');
			return this._validateFileRequest(parsedURL);
		}
	}

	/**
	 * Validates that the versions requested for each element is valid according to the config
	 * @param parsedURL The Elements of the original URL which have been broken down by separators
	 * @returns {boolean} returns a boolean value indicating if the version requested is valid
	 */
	private _validateVersion(parsedURL: string): boolean {
		this._logger.debug('Entering _validateVersion: [' + parsedURL + ']');
		for (let element of this._config.elements) {
			// if the abbreviation of this element is included in the exclusion list dont bother with checking the versions
			if (this._excludes.indexOf(element.abbr) === -1) {
				for (let version of element.versions) {
					this._logger.debug('_validateVersion2: [' + element.abbr + version + ']');

					if (parsedURL === (element.abbr + version)) {
						this._excludes = this._excludes.concat(element.abbr, element.excludes);
						return true;
					}
				}
				if (parsedURL === element.abbr && parsedURL.split('-').length === 1) {
					this._excludes = this._excludes.concat(element.abbr, element.excludes);
					return true;
				}
			}
		}

		return false;
	}
}
