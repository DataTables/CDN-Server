import config from './config';
import { parse } from 'querystring';
export default class BuildFile{
    private fs = require ('fs');

    constructor(){};
    
     buildFile(filePath:String){
        var parsedURL: string[] = filePath.split("/");
        if (parsedURL[0]===""){
            parsedURL.splice(0,1);
        }
        var directoryString: String = ".";
        for(var i = 0; i< parsedURL.length-1;i++){
            directoryString = directoryString.concat("/");
            directoryString = directoryString.concat(parsedURL[i]);
            if(!this.fs.existsSync(directoryString)){
                this.fs.mkdirSync(directoryString);
            }
        }
        
        var splitFileName: String[] = parsedURL[parsedURL.length-1].split(".");
        var file:String = "";
        var splitFile:String[] = [" "," "," "];
        
        if(splitFileName[2] === "js"||splitFileName[1] === "js"){
            file =  this.build(parsedURL,".js");
        }
        if(splitFileName[2] === "css" || splitFileName[1] === "css"){
            file = this.build(parsedURL,".css");
        }

        if(splitFileName[1] === "min"){
            splitFile = file.split("\n")
            file = splitFile[0].concat("\n",splitFile[1].toString(),splitFile[2].toString());
        }

        directoryString = directoryString.concat("/");
        /*this.fs.writeFile(directoryString.concat(parsedURL[parsedURL.length-1]),file,(err) =>{
            if(err){
                console.log(err);
                return "404";
            } else {
                console.log("File Written!");
                return file;
            }
        })*/
        return file;

    }

     build(parsedURL:String[],type:String){
        var fileContent:String = config.buildMessage;

        for(var i = 0; i<parsedURL.length-1;i++){
            
            var filename:String = parsedURL[i].concat(type.toString());
            var fileAddition:string =  this.fetchFile(filename);
            fileContent = fileContent.concat(fileAddition);
        }

        return fileContent;
    }

     fetchFile(filename:String){
         console.log(filename);
         return this.fs.readFileSync(filename).toString();            
    }
}