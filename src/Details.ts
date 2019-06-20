const hash = require( 'hash.js');
let config = require('./config.json');

/**
 * Class for returning answers of queries to the server.
 */
export default class Details{

		/**
		 * This method will return the filesize, hash, list of included files and the return time for a certain file.
		 *
		 * @param content
		 * @param inclusion
		 * @param t0
		 */
		public getDetails(content: string, inclusion: string[], t0: number) {
			let details = {
				fileSize: content.length,
				hash: 'sha256-' + hash.sha256().update(content).digest('hex'),
				includedFiles: inclusion,
				returnTime: 0
			};
			details.returnTime = new Date().getTime() - t0;
			return details;
		}

		/**
		 * This method will return the URL for the latest versions of any given module in the parameter.
		 *
		 * @param content
		 * @param file
		 * @param URLIn
		 * @param filenameIn
		 */
		public getLatest(content: any[], files: any[], URLIn: string, filenameIn: string) {
			let latest = {
				url: URLIn + '...',
				filename: filenameIn,
				files: {
					css: {
						debug: 'sha256-' + hash.sha256().update(content[config.fileTypes.indexOf('.css')]).digest('hex'),
						min: 'sha256-' + hash.sha256().update(content[config.fileTypes.indexOf('.min.css')]).digest('hex')
					},
					js: {
						debug: 'sha256-' + hash.sha256().update(content[config.fileTypes.indexOf('.js')]).digest('hex'),
						min: 'sha256-' + hash.sha256().update(content[config.fileTypes.indexOf('.min.js')]).digest('hex')
					}
				}
			};
			return latest;
		}
}
