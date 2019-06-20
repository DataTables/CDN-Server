const hash = require( 'hash.js');

export default class Details{

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
}
