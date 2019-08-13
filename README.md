# Install
To install the server perform a git clone from this repo: https://github.com/DataTables/CDN-Server
Running the Server
There are currently 3 npm commands for interacting with the server.

`npm run all`

This command will compile all of the typescript files and will then start running the server with default config.

`npm run build`

This command will compile all of the typescript files.

`npm run server`

This command will run the server with the default location for config.

`npm run debug`

This command will run the server with the debug option enabled outputting to the console.

To compile  individual files run the following command

`tsc ./src/{filename}.ts --outDir ./dist/`

To run the server with a custom config file run the following command

`node ./src/Server.ts --configLoc {path to config}`

To re read the config file without terminating the running of the server run the following command

`kill -SIGUSR1 {pid}`

To run the debug to a log file run the following command

`node ./dist/server.js -l {filename}`

To run the debug to a log file and the console run the following command

`node ./dist/server.js -d -l {filename}`

# Basic Flow
The basic flow of the system is listed below.

* The server receives a request.
* The server ensures that only GET methods are being pursued. (405 Bad Request)
* The server validates the URL it has received to ensure that the request is legal. (404 Invalid URL)
* The server builds the requested file and returns it to the user. (200 Success)

# Detailed Flow
A more detailed flow of the system is detailed below, please see the comments in the code for further details.
## Server
* On startup the server checks for an argument defining the location of the config file, if no argument has been provided it reverts to a default location. If an argument has been given for an invalid config location then the process will stop.
* If the config has to be re-read then it is and the cache is reset.
* The server checks the request for a request for any extra functionality, if it is present it performs that action.
* If a normal request is received it runs the parseURL method on the instance of URLValidate. If this evaluates as true then the request is valid and it moves on. Otherwise a 404 is returned.
* The buildFile method is called on the instance of BuildFile. If this returns false then the file could not be built. 500 is returned.
* The server finds the filetype requested and the content type for the http request.
* The server returns the requested file.
## Validation of URL
* The URL is split on `/` to define each of the individual modules and versions requested.
* The last element in the URL should be a file name, this is validated against a regular expression to assure that it conforms to the defined style. Any new file types added should also be added here in the validateFilename Function.
* The validateURL method is then invoked.
* Validation occurs to ensure that any necessary orders have been included in the URL and that the orders occur in the correct order.
* Validation occurs to ensure that only valid Abbreviations have been included in the URL
* Validation occurs to ensure that only valid versions for each module have been included in the URL.
* Validation occurs to ensure that none of the excluded modules due to previous modules excludes list have been included.
* If validateURL returns false then an illegal module has been included in the URL
## Building the File
* The URL is split on `/` to define each of the individual modules and versions requested.
* The config file is consulted for the folder name, file name and any other inclusions of the given abbreviation.
* For each module inclusion a path is created to get to the file location.
* From the file name the system identifies the file type and whether to use the minified version or not. 
* The build method is called to construct the file content.
* For every element of the URL the following occurs
* The derived file name is added to the path, replacing any macros in the string as defined in the config file.
* The fetchFile method is called.
* The cache is checked for the file, if it is found then the system updates the cache and returns the content of the file.
* If the file isn’t in cache and the file exists in the file system then the file is fetched from storage, the cache is updated and the content of the file is returned.
* If the file doesn’t exist then the cache is updated and an empty string is returned. Due to the format of the naming this may occur often, it is not an error as such.
* The content returned from fetchFile is added to an overall content to be returned.
* The macros throughout the final file are replaced.
* The completed file is returned. 
# Config File
The config file defines multiple integral parts of the systems running, these include:
* The location of the files needed to build the requests.
* The message to be added to the top of the requested file.
* The number of files to be stored in cache.
* All of the modules details including:
* The abbreviation of the module.
* Any files that cannot be included alongside this module.
* Any includes that the file brings.
* Any filenames associated with the module.
* The name of the folder where the files are stored
* The name of the module
* The order of the module
* The versions of the module
* The names of the files permitted.
* The types of files permitted.
* Any required order of modules to be included.
* Any substitutions to be made throughout the completed file.
# Cache
The cache operates on a FIFO basis. The cache is updated every time a file is read from it or from storage. The cache is reset whenever a new config file is uploaded while the server is running.
# Extra Functionality 
There are two extra features included with the system which are both useful for debugging and other purposes.
## Details
The first is a details query parameter that returns the following details about any given request.
* The file size.
* The hash associated with that file’s content.
* The files that have been included in the build request.
* The return time for the request

To invoke this query simply append `?details` to the end of the request to the server.
## Latest
The second is a latest query parameter that returns the following details about a string of modules.
* The URL which should be used to request the file that includes all of the latest versions of the modules.
* The name of the file that would be built.
* The hashes for each variation of the file.

To invoke this query simply append `?latest={list of module abbreviations}`  to the end of the request to the server.

