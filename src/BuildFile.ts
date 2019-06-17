import config from './config';
export default class BuildFile {
    private fs = require('fs');

    constructor() {};

    buildFile(filePath: String) {
        // Split URL into useful chunks and remove the first element if it is empty.
        var parsedURL: string[] = filePath.split("/");

        if (parsedURL[0] === "") {
            parsedURL.splice(0, 1);
        }

        // Create a mapping between the URL Abbreviations, folder names, file names, order and includes 
        var folderNameMap = new Map < String, String > ();
        var fileNameMap = new Map < String, String[] > ();
        var orderMap = new Map < String, number > ();
        var includesMap = new Map < String, {} > ();

        for (var i = 0; i < config.elements.length; i++) {

            folderNameMap.set(config.elements[i].abbr, config.elements[i].folderName);
            fileNameMap.set(config.elements[i].abbr, config.elements[i].fileNames);
            orderMap.set(config.elements[i].abbr, config.elements[i].order);

            //Only create mapping if the includes contains at least one property
            if (Object.keys(config.elements[i].fileIncludes).length > 0) {

                includesMap.set(config.elements[i].abbr, config.elements[i].fileIncludes);

            }
        }

        // Grab the Folder names, File names, versions, orders and includes and add them to a list.
        var folderNameList: String[] = [];
        var fileNameList: String[][] = [];
        var versionList: String[] = [];
        var orderList: number[] = [];
        var includesList: {
            [key: string]: string
        } = {};

        var start: number = 0;
        for (var i = 0; i < parsedURL.length; i++) {
            var str: String[] = parsedURL[i].split("-");
            // If the URL includes a version add a "-" to the abbreviation as in config,
            // otherwise no version is associated with this element so push an empty string
            if (str.length > 1) {
                str[0] += "-";
                versionList.push(str[str.length - 1]);
            } else {
                start = 1;
                versionList.push("");
            }

            // If the URL splits to 3 it must be a Sub-Extension, so add the second part of the abbreviation
            if (str.length > 2) {
                str[0].concat(str[1].toString());
            }

            orderList.push(orderMap.get(str[0]));
            folderNameList.push(folderNameMap.get(str[0]));
            fileNameList.push(fileNameMap.get(str[0]));

            if (includesMap.get(str[0]) !== undefined) {
                var keys: string[] = Object.keys(includesMap.get(str[0]));
                var vals: string[] = Object.values(includesMap.get(str[0]));
                for (var j = 0; j < keys.length; j++) {
                    includesList[keys[j]] = vals[j];
                }
            }
        }

        // From the file name, identify filetype, and whether the minified version is to be built
        var splitFileName: String[] = parsedURL[parsedURL.length - 1].split(".");
        var file;
        var type: String = "." + splitFileName[splitFileName.length - 1]
        var min: boolean = false;

        if (splitFileName.length > 2) {
            min = true;
        }

        // Call function to build the required file
        file = this.build(parsedURL, type, min, folderNameList, fileNameList, versionList, orderList, includesList, start);

        return file;

    }

    build(parsedURL: String[], type: String, min: boolean, folderNameList: String[], fileNameList: String[][], versionList: String[], orderList: number[], includesList: { [key: string]: string }, start: number) {
        // Add build message from the config file to the top of the file
        var fileContent: String = config.buildMessage;

        //Set minify to the correct value dependant on parameters
        var minify: String = "";

        if (min) {
            minify = ".min";
        }

        // Work through URL adding all of the files for each element
        for (var i = start; i < parsedURL.length - 1; i++) {
            for (var j = 0; j < fileNameList[i].length; j++) {

                // Create arrays of both the keys and values from the includesList
                var filename: String;
                var includesKeys: String[] = Object.keys(includesList);
                var includesValues: String[] = Object.values(includesList);

                // Replace Macros defined in includes with the corresponding value 
                for (var k = 0; k < includesKeys.length; k++) {
                    fileNameList[i][j] = fileNameList[i][j].replace("{" + includesKeys[k] + "}", includesValues[k].toString());
                    fileNameList[i][j] = fileNameList[i][j].replace("{version}", versionList[i].toString());
                }

                // Append the minify and type to the filename
                var filename: String = fileNameList[i][j].concat(minify.toString(), type.toString());
                
                // Folders are not prefixed by a ".", therefore if there is one included in the type ignore it
                var folderType: String[] = type.split(".");

                // Create path based on order of the element
                if (orderList[i] != 20) {
                    var path: String = config.buildLocation.concat(folderNameList[i].toString(), "-", versionList[i].toString(), "/", folderType[folderType.length - 1].toString(), "/", filename.toString());
                } else {
                    var path: String = config.buildLocation.concat(folderNameList[i].toString(), "-", versionList[i].toString(), "/", filename.toString());
                }

                // Get the new bit of file
                var fileAddition = this.fetchFile(path);

                // If "500" is returned then a server error has occured so return false
                if (fileAddition === "500") {
                    return false;
                }

                // Add the new addition to the final file
                fileContent = fileContent.concat(fileAddition.toString());
            }

        }

        // Return the finished product
        return fileContent;
    }

    fetchFile(filename: String) {
        // Try to find the file and return it, if it's not found then return an empty string,
        // If an error occurs return "500" and log it.
        try {
            if (this.fs.existsSync(filename)) {
                console.log("found:", filename);
                return this.fs.readFileSync(filename).toString();
            } else {
                console.log("not found:", filename);
                return "";
            }
        } catch {
            console.log("Error 500. Internal Server Error");
            return "500";
        }
    }
}