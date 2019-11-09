/**
 * This class controls and acts as the Cache for the CDN Server
 */
export default class Cache {
	private _cacheMap = new Map<string, string | Buffer>();
	private _cacheList: string[] = [];
	private _cacheSize = 1;
	private _config;
	private _logger;
	public _maps;

	/**
	 * Defines the size of the cache as per the config
	 * @param cacheSize the size of the cache to be kept
	 */
	constructor(cacheSize = null, logger, config) {
		if (cacheSize !== null) {
			this._cacheSize = cacheSize;
		}
		this._config = config;
		this._logger = logger;
	}

	/**
	 * This method resets the cache so that if the value of its max length is changed then it adjusts itself to this length
	 * @param _configIn The external _config which is to be read in
	 */
	public resetCache(_cacheSize, config): void {
		this._logger.debug('Reset Cache Request');
		this._cacheMap = new Map<string, string>();
		this._cacheList = [];
		this._cacheSize = _cacheSize;
		this._config = config;
		this._logger.debug('Reset Maps');
		this.createMaps();
		this._logger.debug('Cache Reset');
	}

	/**
	 * Searches the cache for the file passed in, if present it returns true if not false
	 * @param filename The name of the file to search the cache for
	 * @returns {boolean | string} Returns the file if it is found and false if it is not
	 */
	public searchCache(filename: string): boolean | string | Buffer {
		if (this._cacheMap.has(filename)) {
			this._logger.debug('File is present in cache, returning file.');
			return this._cacheMap.get(filename);
		}
		else {
			this._logger.debug('File is not present in cache.');
			return false;
		}
	}

	/**
	 * Updates the cache to include the filename and content being passed in.
	 * @param filename Filename which is currently being added to the cache
	 * @param fileContent The content of the file that is currently being added to the cache
	 */
	public updateCache(filename: string, fileContent: string | Buffer, refresh: boolean): void {
		this._logger.debug((refresh ? 'Refresh' : 'Update') + ' Cache Request');

		// If the _cacheMap is approaching the limit size then delete the first element in the list
		if (this._cacheMap.size >= this._cacheSize) {
			this._logger.debug('Cache at size limit, removing content');
			this._cacheMap.delete(this._cacheList[0]);
			this._cacheList.splice(0, 1);
		}

		// If the filename is not present in the cache then add it and the content to the map
		if (!this._cacheMap.has(filename)) {
			this._logger.debug('File is not yet present in Cache, adding to map');
			this._cacheMap.set(filename, fileContent);
		}

		// Add the filename to the end of the _cacheList
		this._cacheList.push(filename);
		this._logger.debug((refresh ? 'Refresh filing in' : 'Adding file to') + ' Cache ' + filename);
	}

	/**
	 * Creates all of the maps that are used throughout the operation of the server
	 */
	public createMaps(): void {
		// declare all of the maps that will be used throughout the operation of the server
		let outputOrderMap = new Map<string, number>();
		let folderNameMap = new Map<string, string>();
		let moduleNameMap = new Map<string, string>();
		let fileNameMap = new Map<string, Map<string, string[]>>();
		let includesMap = new Map<string, {}>();

		for (let element of this._config.elements) {
			outputOrderMap.set(element.abbr, element.outputOrder);
			folderNameMap.set(element.abbr, element.folderName);
			moduleNameMap.set(element.abbr, element.moduleName);

			let fileKeys = Object.keys(element.fileNames);
			let fileValues: string[][] = Object.values(element.fileNames);

			// This is the map between the file type and the array of files to be built
			let tempMap = new Map<string, string[]>();

			for (let j = 0; j < fileKeys.length; j++) {
				tempMap.set(fileKeys[j], fileValues[j]);
			}

			if (fileKeys.length > 0) {
				fileNameMap.set(element.abbr, tempMap);
			}

			// Only create mapping if the includes contains at least one property
			if (Object.keys(element.fileIncludes).length > 0) {
				includesMap.set(element.abbr, element.fileIncludes);
			}
		}

		this._maps = {
			fileNameMap,
			folderNameMap,
			includesMap,
			moduleNameMap,
			outputOrderMap,
		};
	}
}
