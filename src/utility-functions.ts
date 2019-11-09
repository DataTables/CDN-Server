import Logger from './Logger';

/**
 * Finds the point at which the static request begins
 * @param parsedURL the inputURL of which the cut point is to be found
 */
export function findStaticRequest(
	parsedURL: string[],
	maps: Map<string, number>,
	requires: number[],
	logger: Logger): number {

	// iterate through the URL and extract the order for each element, adding to orderList
	let orderList: number[] = [];
	let requireList: number[];

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
		orderList.push(maps.get(str[0]));
	}

	// validate Order, Abbreviation and requirements list.
	if (requires !== undefined) {
		requireList = requires.slice();
	}

	for (let j = 0; j < orderList.length; j++) {
		if (requires !== undefined) {
			if (requireList.indexOf(orderList[j]) > -1) {
				requireList.splice(requireList.indexOf(orderList[j]), 1);
			}
		}

		// Check that the elements of the URL are in the correct order
		// Order list can be undefined if an unknown element is requested from the map
		if (orderList[j] === undefined) {
			logger.error('Unknown module ' + parsedURL[j] + ' specified.');
			return j;
		}
	}

	logger.debug('URL modules are all in the correct order.');

	if (requires !== undefined) {
		if (requireList.length > 0) {
			logger.error('Not all of the required Modules have been included. Still requires: ' + requireList);
			return 0;
		}
		logger.debug('All of the required modules have been included.');
	}

	return -1;
}
