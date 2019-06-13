const http = require('http');
const URLValidate = require('./URLValidate').default;
const BuildFile = require('./BuildFile').default;

http.createServer(function (req,res){
    console.log(req.url);
    var URL = new URLValidate();
    if(URL.parseURL(req.url)){
        var Bui = new BuildFile();
        res.write(Bui.buildFile(req.url));
        res.end();
    }else{
    res.write('I should be working');

    }
    res.end();
}).listen(8080);