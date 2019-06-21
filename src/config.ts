interface IConfig {
	/**
	 * The location of the top level file containing all of the sub folders for build files.
	 */
	buildLocation: string;
	/**
	 * The message to be included at the top of the finished file.
	 *
	 * NOTE - THIS MUST REMAIN CONSISTENT OTHERWISE THE HASHES WILL CHANGE AND FAIL.
	 */
	buildMessage: string;
	/**
	 * The number of files that will be stored in the cache at any given time.
	 */
	cacheSize: number;
	/**
	 * All of the modules that may be included in to build file.
	 */
	elements: IElements[];
	/**
	 * A list of the permitted names of files to be requested from the builder.
	 */
	fileNames: string[];
	/**
	 * A list of the potential file types that could be requested.
	 */
	fileTypes: string[];
	/**
	 * A list of the orders that must appear in the request URL in order for a build to be succesful.
	 */
	requires: number[];
	/**
	 * Substitutions to be made throughout the built file.
	 *
	 * There are 2 predefined substitutions, extensionURL and extensionList.
	 * These provide the build message with custom data relating to the file that has been requested.
	 */
	substitutions: {[key: string]: string};
}
interface IElements {
	/**
	 * The abbreviation of the module as seen in the URL.
	 */
	abbr: string;
	/**
	 * The abbreviation of any modules that are not permitted alongside this one should be noted here.
	 */
	excludes: string[];
	/**
	 *  Any entries into file Includes will be replaced in a forward match manner.
	 */
	fileIncludes: {[key: string]: string};
	/**
	 * The key in fileNames should be the file type of the given file names inside the corresponding array.
	 */
	fileNames: {[key: string]: string[]};
	/**
	 * The name of the target folder that holds the desired files for this module.
	 */
	folderName: string;
	/**
	 * The name of the Module to show in the extensions list in top comment
	 */
	moduleName: string;
	/**
	 * The order represents the order that the modules must be loaded in.
	 *
	 * Eg. Modules with order 20 must come before a module of order 30 and after any of order 10.
	 */
	order: number;
	/**
	 * A list of the available versions for this module.
	 */
	versions: string[];
}
