import Logger from './Logger';

/**
 * Split a url module part into the name and version
 *
 * @param input URL parts
 * @returns Version and name
 */
export function moduleAbbrAndVersion(input: string) {
	let parts = input.match(/\-(\d+\.\d+\.\d+(\-\w+(\.\d+)?)?)/);

	return parts
		? {
				name: input.replace(parts[0], ''),
				abbr: input.replace(parts[1], ''),
				version: parts[1]
		  }
		: {
				name: input,
				abbr: input,
				version: ''
		  };
}

/**
 * Finds the point at which the static request begins
 *
 * @param parsedURL the inputURL of which the cut point is to be found
 */
export function findStaticRequest(
	parsedURL: string[],
	maps: Map<string, number>,
	requires: number[],
	logger: Logger
): number {
	// iterate through the URL and extract the order for each element, adding to
	// orderList
	let orderList: number[] = [];
	let requireList: number[];

	for (let element of parsedURL) {
		let parts = moduleAbbrAndVersion(element);

		orderList.push(maps.get(parts.abbr));
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

		// Check that the elements of the URL are in the correct order Order
		// list can be undefined if an unknown element is requested from the map
		if (orderList[j] === undefined) {
			logger.error(
				this._id + ' - Unknown module ' + parsedURL[j] + ' specified.'
			);
			return j;
		}
	}

	logger.debug(this._id + ' - URL modules are all in the correct order.');

	if (requires !== undefined) {
		if (requireList.length > 0) {
			logger.error(
				this._id +
					' - Not all of the required Modules have been included. Still requires: ' +
					requireList
			);
			return 0;
		}
		logger.debug(
			this._id + ' - All of the required modules have been included.'
		);
	}

	return -1;
}
