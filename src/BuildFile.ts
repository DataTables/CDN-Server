import config from './config';
import { parse } from 'querystring';
import { version } from 'punycode';
export default class BuildFile{
    private fs = require ('fs');

    constructor(){};
    
     buildFile(filePath:String){
        // Split URL into useful chunks and remove the first element if it is empty.
        var parsedURL: string[] = filePath.split("/");
        if (parsedURL[0]===""){
            parsedURL.splice(0,1);
        }
        
        // Create a mapping between the URL Abbreviations and the folder names and file names 
        var folderNameMap = new Map<String,String>();
        var fileNameMap = new Map<String,String>();
        var orderMap = new Map<String,number>();
        for(var i = 0; i<config.elements.length;i++){
            folderNameMap.set(config.elements[i].abbr,config.elements[i].folderName);
            fileNameMap.set(config.elements[i].abbr, config.elements[i].fileName);
            orderMap.set(config.elements[i].abbr,config.elements[i].order);
        }

        // Grab the Folder names, File names and versions and add them to a list.
        var folderNameList:String[]=[];
        var fileNameList:String[]=[];
        var versionList:String[]=[];
        var orderList:number[]=[];
        var start:number=0;
        for(var i = 0; i<parsedURL.length;i++){
            var str:String[] = parsedURL[i].split("-");

            // If the URL includes a version add a "-" as in config
            if(str.length>1){
                str[0] += "-";
                versionList.push(str[str.length-1]);
            } else {
                start = 1;
                versionList.push("");
            }

            // If the URL splits to 3 it must be a Sub-Extension, so add the second part of the abbreviation
            if(str.length >2){
                str[0].concat(str[1].toString());
            } 
            orderList.push(orderMap.get(str[0]));
            folderNameList.push(folderNameMap.get(str[0]));
            fileNameList.push(fileNameMap.get(str[0]));
            
        }

        // from the file name, identify filetype, and minified
        var splitFileName: String[] = parsedURL[parsedURL.length-1].split(".");
        var file;
        var type:String = "." + splitFileName[splitFileName.length-1]
        var min:boolean = false;
        var styling:String = fileNameList[0]; 

        if(splitFileName.length>2){
            min = true;
        }


        file = this.build(parsedURL,type,min,folderNameList,fileNameList,versionList,orderList,styling,start);
        

        

        return file;

    }

     build(parsedURL:String[],type:String,min:boolean,folderNameList:String[],fileNameList:String[],versionList:String[],orderList:number[],styling:String,start:number){
        var fileContent:String = config.buildMessage;
        var minify:String = "";

        if(min){
            minify =".min";
        }
        for(var i = start; i<parsedURL.length-1;i++){
            var splitFile:String[] = fileNameList[i].split(".");
            var filename:String;
            if(type === ".js"){
                if(fileNameList[i] === "jquery"){
                    filename = fileNameList[i].concat("-",versionList[i].toString(), minify.toString(), type.toString());
                } else if(orderList[i]===20){
                    filename = fileNameList[i].concat(minify.toString(), type.toString());
                }else if(styling != "dataTables"){
                    var prefix:String[] = fileNameList[i].split(".");
                    filename= prefix[prefix.length-1].concat(".",styling.toString(),minify.toString(), type.toString());
                } else {
                    if(splitFile.length>1){
                        filename = fileNameList[i].concat(minify.toString(),type.toString());
                    }else{
                        filename = styling.concat(".", fileNameList[i].toString(), minify.toString(), type.toString());
                    }
                }
            } else if( type === ".css"){
                if(orderList[i]===20){

                }else if(styling != "dataTables"){
                    var prefix:String[] = fileNameList[i].split(".");
                    filename = prefix[prefix.length-1].concat(".",styling.toString(),minify.toString(), type.toString());
                } else {
                    if(fileNameList[i] === "jquery.dataTables"){
                        filename = fileNameList[i].concat(minify.toString(), type.toString());
                    }else{
                        filename = fileNameList[i].concat(".",styling.toString(),minify.toString(), type.toString());
                    }
                }
            }

            var folderType:String[] = type.split(".");
            if(orderList[i] != 20){
                var path:String = "cache/" + folderNameList[i].concat("-",versionList[i].toString(),"/",folderType[folderType.length-1].toString(),"/",filename.toString());
            }else if(orderList[i]===20 && type === ".css"){

            }else {
                var path:String = "cache/" + folderNameList[i].concat("-", versionList[i].toString(),"/",filename.toString());
            }

            if(orderList[i] === 20 && type === ".css" ){

            }else{
                console.log("adding");
                var fileAddition = this.fetchFile(path);
                if(fileAddition === "500"){
                    return false;
                }
                fileContent = fileContent.concat(fileAddition.toString());            
            }
        }

        return fileContent;
    }

     fetchFile(filename:String){
         try{
            return this.fs.readFileSync(filename).toString();            
         } catch {
             console.log("Error 500. Internal Server Error");
             return "500";
         }    
    }
}

        /*
        
        var directoryString: String = ".";
        for(var i = 0; i< parsedURL.length-1;i++){
            directoryString = directoryString.concat("/");
            directoryString = directoryString.concat(parsedURL[i]);
            if(!this.fs.existsSync(directoryString)){
                this.fs.mkdirSync(directoryString);
            }
        }

        this.fs.writeFile(directoryString.concat(parsedURL[parsedURL.length-1]),file,(err) =>{
            if(err){
                console.log(err);
                return "404";
            } else {
                console.log("File Written!");
                return file;
            }

            directoryString = directoryString.concat("/");
        })*/