export default class Cache {
	public cacheMap = new Map<string, string>();
	public cacheList: string[] = [];
	private config;

	constructor(configIn) {
		this.config = configIn;
	}
	public updateCache(filename: string, fileContent: string) {
		if (this.cacheMap.has(filename)) {
			this.cacheMap.delete(filename);
			this.cacheList.splice(this.cacheList.indexOf(filename), 1);
		}
		else if (this.cacheMap.size >= this.config.cacheSize) {
			this.cacheMap.delete(this.cacheList[0]);
			this.cacheList.splice(0, 1);
		}
		this.cacheMap.set(filename, fileContent);
		this.cacheList.push(filename);
	}

	public searchCache(filename: string) {
		if (this.cacheMap.has(filename)) {
			return this.cacheMap.get(filename);
		}
		else {
			return false;
		}
	}

	public resetCache(configIn) {
		while (this.cacheList.length > 0) {
			this.cacheMap.delete(this.cacheList.pop());
		}
		this.config = configIn;
	}
}
