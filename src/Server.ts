import { request } from 'https';

import fileExtension from 'file-extension';
import * as http from 'http';
import mime from 'mime-types';
import BuildFile from './BuildFile';
import URLValidate from './URLValidate';
http.createServer(function(req, res) {
	let URL = new URLValidate();
	if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
		res.write('405 Bad Request');
		res.statusCode = 405;
	}
	else if (URL.parseURL(req.url)) {
		let Bui = new BuildFile();
		let content = Bui.buildFile(req.url);

		if (content === false) {

			res.write('Error 500. File not Found');
			res.statusCode = 500;

		}
		else {
			let extension: string = fileExtension(req.url);
			let type = mime.lookup(extension);
			res.writeHead(200, {
				'Content-Type': type + '; charset=utf-8'
			});
			res.write(content);
		}
		res.end();
	}
	else {
		res.statusCode = 404;
	}
	res.end();
}).listen(8080);
