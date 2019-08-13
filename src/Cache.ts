export default class Cache {
	private _cacheMap = new Map<string, string>();
	private _cacheList: string[] = [];
	private _cacheSize = 1;
	private _logger;

	/**
	 * Defines the size of the cache as per the config
	 * @param cacheSize the size of the cache to be kept
	 */
	constructor(cacheSize = null, logger) {
		if (cacheSize !== null) {
			this._cacheSize = cacheSize;
		}
		this._logger = logger;
	}

	/**
	 * This method resets the cache so that if the value of its max length is changed then it adjusts itself to this length
	 * @param _configIn The external _config which is to be read in
	 */
	public resetCache(_cacheSize): void {
		this._logger.debug('Reset Cache Request');
		this._cacheMap = new Map<string, string>();
		this._cacheList = [];
		this._cacheSize = _cacheSize;
		this._logger.debug('Cache Reset');
	}

	/**
	 * Searches the cache for the file passed in, if present it returns true if not false
	 * @param filename The name of the file to search the cache for
	 * @returns {boolean | string} Returns the file if it is found and false if it is not
	 */
	public searchCache(filename: string): boolean | string {
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
	public updateCache(filename: string, fileContent: string): void {
		this._logger.debug('Update Cache Request');
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
		this._logger.debug('Adding file to Cache');
	}
}
