// Import libraries used within the server
import fileExtension from 'file-extension';
import * as http from 'http';
import mime from 'mime-types';
import BuildFile from './BuildFile';
import URLValidate from './URLValidate';

/**
 * This is the server for requesting files to be built.
 * It validates the URL that it takes and builds the file before returning them to the user.
 */
http.createServer(function(req, res) {
	let URL = new URLValidate();
	// Ensure a valid request type is being made and validate that the requested url is also valid
	if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
		res.write('405 Bad Request');
		res.statusCode = 405;
	}
	else if (URL.parseURL(req.url)) {

		// Build requested file
		let Bui = new BuildFile();
		let content = Bui.buildFile(req.url);

		if (content === false) {

			res.write('Error 500. File not Found');
			res.statusCode = 500;

		}
		else {

			// Find the file type that has been requested and the content type for http
			let extension: string = fileExtension(req.url);
			let type = mime.lookup(extension);
			res.writeHead(200, {
				'Content-Type': type + '; charset=utf-8'
			});

			// Return file
			res.write(content);
		}
		res.end();
	}
	else {
		res.statusCode = 404;
	}
	res.end();
}).listen(8080);
