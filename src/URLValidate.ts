import config from './config'
export default class URLValidate{
    private fs = require('fs');

    excludes=[];

    constructor(){}

    parseURL(inputURL: String){

        var parsedURL: String[];

        //split URL into useful elements
        parsedURL = inputURL.split("/");

        //The last element should be a valid file name, so assign it to filename and validate.
        var filename:String = parsedURL.pop();
        var output:boolean = this.validateFilename(filename); 
        if(!output){
            return false;
        }

        //Validate the remainder of the URL
        output = this.validateURL(parsedURL);
        return output;
    }

    validateURL(parsedURL:String[]){

        //if the URL started with a '/' then element 0 will be empty so remove it
        if (parsedURL[0]===""){
            parsedURL.splice(0,1);
        }
        console.log(parsedURL);

        //declare an order map, mapping the abbreviation of each element to its order
        let orderMap = new Map<String,number>();
        for(var j = 0; j<config.elements.length;j++){
            orderMap.set(config.elements[j].abbr,config.elements[j].order);
        }

        //iterate through the URL and extract the order for each element, adding to orderList
        var orderList: number[] = [];
        for(var j = 0; j<parsedURL.length;j++){
            var str:String[] = parsedURL[j].split("-");
            if(str.length>1){
                str[0] += "-";
            }
            orderList.push(orderMap.get(str[0]));
        }

        //validate Order, Abbreviation and requirements list.
        var requireList:number[]=config.requires;
        for(var j = 0; j<orderList.length;j++){
            if(requireList.indexOf(orderList[j]) > -1){
                requireList = requireList.filter(function(element,index,array){
                    return (element != orderList[j]);
                });
            }
            if(orderList[j]===undefined){
                console.log("unrecognised URL Element");
                return false;
            }else if(j>0 && orderList[j] < orderList[j-1]){
                console.log("URL not ordered");
                return false;
            }
        }
        if(requireList.length>0){
            console.log("Requirements not met in URL");
            return false;
        }
        console.log(orderList);
        
        //Validate each element has a correct version and that following elements do not include
        //any of the excludes for the current element.
        for(var i = 0; i<parsedURL.length;i++){
            var valid:boolean = this.validateVersion(parsedURL[i]);
            if(!valid){
                return false;
            }
        }
        return true;
    }

    validateVersion(parsedURL:String){
        for(var j = 0; j<config.elements.length; j++){

            //if the abbreviation of this element is included in the exclusion list dont bother with checking the versions
            if(this.excludes.indexOf(config.elements[j].abbr) === -1 ){          
                for(var k = 0; k<config.elements[j].versions.length;k++){
                    if(parsedURL === (config.elements[j].abbr + config.elements[j].versions[k])){
                        for(var l = 0; l<config.elements[j].excludes.length;l++){
                            this.excludes.push(config.elements[j].excludes[l]);
                        }
                        return true;
                    }
                }
            }
        }
        console.log("Invalid version or an element is included in a previous elements exclusion list.")
        return false;
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