import { request } from "https";

const http = require('http');
const URLValidate = require('./URLValidate').default;
const BuildFile = require('./BuildFile').default;

http.createServer(function (req,res){
    console.log(req.url);
    var URL = new URLValidate();
    console.log(req.method);
    if(req.method === "POST"||req.method==="PUT"||req.method==="DELETE"){
        res.write('405 Bad Request');
        res.statusCode = 405;
    }else if(URL.parseURL(req.url)){
        var Bui = new BuildFile();
        
        //res.write(Bui.buildFile(req.url));

        var content = Bui.buildFile(req.url);

        if(content===false){
            res.write("Error 500. File not Found");
            res.statusCode = 500;
            
        } else {
            res.write(content);
            res.statusCode = 200;
        }
        res.end();
    }else{
        res.statusCode = 404;
    }
    res.end();
}).listen(8080);