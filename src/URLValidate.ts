import * as cmp from 'semver-compare';
/**
 * This class will validate that the URL given is a valid build path.
 */
export default class URLValidate {
	private config;
	private fs = require('fs');

	private excludes = [];

	constructor(configIn) {
		this.config = configIn;
	}
	public parseURL(inputURL: string) {

		let parsedURL: string[];

		// split URL into useful elements
		parsedURL = inputURL.split('/');

		// The last element should be a valid file name, so assign it to filename and validate.
		let filename: string = parsedURL.pop();
		let output: boolean = this.validateFilename(filename);
		if (!output) {
			return false;
		}

		// Validate the remainder of the URL
		output = this.validateURL(parsedURL);
		return output;
	}
	public validateLatest(inputURL: string) {
		let parsedURL: string[];

		parsedURL = inputURL.split('/');
		let stylingLegal: boolean = false;

		// Confirm that the choice of styling is legal.
		for (let element of this.config.elements) {
			if (parsedURL[0] === element.abbr && element.order === 10) {
				stylingLegal = true;
				break;
			}
		}
		if (!stylingLegal) {
			return false;
		}

		// Confirm that the URL only contains valid abbreviations.
		for (let i = 1; i < parsedURL.length; i++) {
			if (!this.validateAbbreviation(parsedURL[i])) {
				return false;
			}
			parsedURL[i] += '-';
		}

		// Generate the necessary URL by finding all of the latest versions.
		let filename = '';
		for (let i = 0; i < parsedURL.length; i++) {
			parsedURL[i] += this.findLatestVersion(parsedURL[i]);
			filename += parsedURL[i] + '/';
		}

		// Validate the generated URL to make sure that it is legal.
		if (this.validateURL(parsedURL)) {
			return filename;
		}
		return false;
	}

	private validateURL(parsedURL: string[]) {

		// if the URL started with a '/' then element 0 will be empty so remove it
		if (parsedURL[0] === '') {
			parsedURL.splice(0, 1);
		}
		// console.log(parsedURL);

		// declare an order map, mapping the abbreviation of each element to its order
		let orderMap = new Map<string, number>();
		for (let element of this.config.elements) {
			orderMap.set(element.abbr, element.order);
		}

		// iterate through the URL and extract the order for each element, adding to orderList
		let orderList: number[] = [];
		for (let element of parsedURL) {
			let str: string[] = element.split('-');
			if (str.length > 1) {
				str[0] += '-';
			}
			if (str.length > 2) {
				for (let k = 1; k < str.length - 1; k++) {
					str[0] = str[0] += str[k];
					str[0] += '-';
				}
			}
			orderList.push(orderMap.get(str[0]));
		}

		// validate Order, Abbreviation and requirements list.
		let requireList: number[] = this.config.requires;
		for (let j = 0; j < orderList.length; j++) {
			if (requireList.indexOf(orderList[j]) > -1) {
				requireList = requireList.filter(function(element, index, array) {
					return (element !== orderList[j]);
				});
			}
			if (orderList[j] === undefined) {
				return false;
			}
			else if (j > 0 && orderList[j] < orderList[j - 1]) {
				return false;
			}
		}
		if (requireList.length > 0) {
			return false;
		}
		// console.log(orderList);

		// Validate each element has a correct version and that following elements do not include
		// any of the excludes for the current element.
		for (let element of parsedURL) {
			let valid: boolean = this.validateVersion(element);
			if (!valid) {
				return false;
			}
		}
		return true;
	}

	private validateVersion(parsedURL: string) {
		for (let element of this.config.elements) {

			// if the abbreviation of this element is included in the exclusion list dont bother with checking the versions
			if (this.excludes.indexOf(element.abbr) === -1) {
				for (let version of element.versions) {
					if (parsedURL === (element.abbr + version)) {
						for (let excludesList of element.excludes) {
							this.excludes.push(excludesList);
						}
						return true;
					}
				}
			}
		}
		return false;
	}

	private validateFilename(filename: string) {
		// Validate that the ending of the URL is valid
		if (filename.search(new RegExp('(' + this.config.fileNames.join('|') + ')(\.min)?\.(js|css)$')) < 0) {
			return false;
		}
		return true;
	}

 private validateAbbreviation(parsedURL: string) {
	 	// Scan all of the modules to find the abbreviation.
		for (let element of this.config.elements) {
			if (parsedURL === element.abbr.split('-')[0]) {
				return true;
			}
		}
		return false;
	}

	private findLatestVersion(mod: string) {
		// Sort the versions for the element using the library and return the biggest one.
		for (let element of this.config.elements) {
			if (mod === element.abbr) {
				let versions = element.versions.sort(cmp);
				return versions[versions.length - 1];
			}
		}
	}

}
