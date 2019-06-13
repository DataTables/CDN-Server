
import config from './config'
import { SSL_OP_SSLEAY_080_CLIENT_DH_BUG } from 'constants';
export default class FileRead{
    private fs = require('fs');

    excludes=[];

    constructor(){}

    fetchFile(){
        this.fs.readFile('src/testFetch.js', function(err,data){
            if(err){
                console.log(err);
            } else {
                console.log("Asynchronous read: " + data.toString());
            }
        })
    }

    parseURL(inputURL: String){
        var parsedURL: String[];
        parsedURL = inputURL.split("/");
        var filename:String = parsedURL.pop();
        var output:boolean = this.validateFilename(filename); 
        if(!output){
            return false;
        }
        output = this.validateURL(parsedURL);
        return output;
    }

    sendFile(){

    }

    validateURL(parsedURL:String[]){
        if (parsedURL[0]===""){
            parsedURL.splice(0,1);
        }
        console.log(parsedURL);

        let orderMap = new Map<String,number>();
        for(var j = 0; j<config.elements.length;j++){
            orderMap.set(config.elements[j].abbr,config.elements[j].order);
        }

        var orderList: number[] = [];
        for(var j = 0; j<parsedURL.length;j++){
            var str:String[] = parsedURL[j].split("-");
            if(str.length>1){
                str[0] += "-";
            }
            orderList.push(orderMap.get(str[0]));
        }

        for(var j = 0; j<orderList.length;j++){
            if(orderList[j]===undefined){
                console.log("unrecognised URL Element");
                return false;
            }else if(j>0 && orderList[j] < orderList[j-1]){
                console.log("URL not ordered");
                return false;
            }
        }
        console.log(orderList);
        
        //Validate that the first element is a styling framework(order 10)
        var stylFound:boolean =false;
        for(var j=0;j<config.elements.length;j++){
            if(config.elements[j].order===10){
                stylFound = this.checkVersionStyling(parsedURL[0],j)
                if(stylFound){
                    break;
                } 
            }  
        }

        if(!stylFound){
            console.log("Invalid Input Start");
            return false;
        }

        //validate thirdparty elements of URL are legal
        var i:number = 1;
        var validThird:number;
        for( ;i<parsedURL.length-1;i++){
            if(orderList[i]<30){
                validThird = this.checkPackage(parsedURL,i);
                if(validThird===2){
                    return false;
                } else if(validThird===1){
                    console.log(i);
                    i++;
                    break;
                } else {
                    console.log("Invalid Package")
                    return false;
                }
            } else {
                
                break;
            }
                  
        }
        console.log(parsedURL[i]);
        if(orderList[i]<30){
            return false;
        }
        console.log(i)
        //check for DataTables inclusion
        var includesDT:boolean = this.checkDT(parsedURL[i])
        
        if(includesDT){
            
            i++;
        }
        
        if(orderList[i] <40){
            return false;
        }
        console.log(i);
        //validate datatables elements of URL are legal
        var validExtension: boolean = true;
        for(; i<parsedURL.length;i++){
            validExtension = this.checkExtension(parsedURL[i]);
            if(!validExtension){
                break;
            }
        }
        
        if(!validExtension){
            console.log("Invalid Input Extensions");
            return false;
        }
        
        return true;
        
    }

    checkVersionStyling(parsedURL:String,i:number){
        for(var j=0;j<config.elements[i].versions.length;j++){
            if (parsedURL===(config.elements[i].abbr+config.elements[i].versions[j])){
                return true;
            }
              
        }
        return false;
    }

    checkDT(parsedURL:String){
        for(var k = 0; k<config.elements.length;k++){
            if(config.elements[k].order===30){
                for(var j = 0; j<config.elements[k].versions.length;j++){
                    if(parsedURL ===(config.elements[k].abbr+config.elements[k].versions[j])){
                        return true;
                    }
                }
            }
        }
        
    }

    checkVersionExtension(parsedURL:String,i:number){
        for(var j =0; j<config.elements[i].versions.length;j++){
            if(parsedURL===(config.elements[i].abbr+config.elements[i].versions[j])){
                return true;
            }
        }
        return false;
    }

    checkVersionPackage(parsedURL:String[], k:number,x:number){
        for(var j=0;j<config.elements[k].versions.length; j++){
            //console.log(parsedURL[x]);
            if(parsedURL[x]===(config.elements[k].abbr+config.elements[k].versions[j])){
                console.log(config.elements[k].abbr);
                console.log(config.elements[k].versions[j]);
                if(config.elements[k].abbr === "jq-" || config.elements[k].abbr ==="jqc-"){

                    var doubleJQ:boolean = this.checkDoubleJQ(parsedURL,x,config.elements[k].abbr);
                    if(!doubleJQ){
                        return 2;
                    }
                    return 1;           
                }
                return 1;         
            }
        }
        return 0;
    }

    checkExtension(parsedURL:String){
        var versionFound: boolean = false;
        for(var j = 0; j<config.elements.length; j++ ){
            if(config.elements[j].order===40){
                console.log("");
                console.log(parsedURL);
                console.log(j);
                console.log("");
                versionFound = this.checkVersionExtension(parsedURL,j)
                if(versionFound){
                    return true;
                }
            }
        }
        return false;
    }
    checkPackage(parsedURL:String[],x: number){
        var packageFound:number = 0;
        for(var j = 0; j<config.elements.length;j++){
            //console.log(config.elements[j].order);
            if(config.elements[j].order === 20){
                packageFound = this.checkVersionPackage(parsedURL,j,x);
                if (packageFound===1||packageFound===2){
                    return packageFound;
                }
            }
        }
        return 0;
    }

    checkDoubleJQ(parsedURL:String[],x:number,type:String){
        var isDouble = false;
        var packagePoint = 0;
        console.log("type:",type);
        if(type === "jq-"){
            packagePoint=this.findAbbrPackage("jqc-");
        }else if(type ==="jqc-"){
            packagePoint=this.findAbbrPackage("jq-");
        }
        for(var j = x+1; j<parsedURL.length;j++){
            for(var k = 0; k<config.elements[packagePoint].versions.length;k++){
                if(parsedURL[j] === (config.elements[packagePoint].abbr + config.elements[packagePoint].versions[k])){
                    console.log("Double JQuery Inclusion")
                    return false;
                }
            }
        }
        return true;
    }

    findAbbrPackage(abre:String){
        for(var j= 0; j<config.elements.length;j++){
            if(abre===config.elements[j].abbr){
                return j;
            }
        }
        return -1;
    }

    validateFilename(filename:String){
         //Validate that the ending of the URL is valid
         if(filename.search(new RegExp("("+config.filename.join("|")+")(\.min)?\.(js|css)$")) <0){
            console.log("Invalid Input End");
            return false;
        }
        return true;
    }
}

