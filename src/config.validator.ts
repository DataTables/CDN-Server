/* tslint:disable */
// generated by typescript-json-validator
import { inspect } from 'util';
import * as Ajv from 'ajv';
import { IConfig } from './config';
export const ajv = new Ajv.default({
  allErrors: true,
  coerceTypes: false,
  useDefaults: true,
  strict: false,
});

ajv.addMetaSchema(require('ajv/lib/refs/json-schema-draft-06.json'));

export { IConfig };
export const IConfigSchema = {
  "$schema": "http://json-schema.org/draft-07/schema#",
  "defaultProperties": [
  ],
  "definitions": {
    "IElements": {
      "defaultProperties": [
      ],
      "properties": {
        "abbr": {
          "description": "The abbreviation of the module as seen in the URL.",
          "type": "string"
        },
        "description": {
          "description": "Not used. Purely here to allow the config files to be more readable by allowing a property\n   to effectively act as a comment describing the element.",
          "type": "string"
        },
        "excludes": {
          "description": "The abbreviation of any modules that are not permitted alongside this one should be noted here.\nThe abbreviation of this element is automatically excluded from other occurences in the URL.",
          "items": {
            "type": "string"
          },
          "type": "array"
        },
        "fileIncludes": {
          "additionalProperties": {
            "type": "string"
          },
          "defaultProperties": [
          ],
          "description": "Any entries into file Includes will be replaced in a forward match manner.",
          "type": "object"
        },
        "fileNames": {
          "additionalProperties": {
            "items": {
              "type": "string"
            },
            "type": "array"
          },
          "defaultProperties": [
          ],
          "description": "The key in fileNames should be the file type of the given file names inside the corresponding array.",
          "type": "object"
        },
        "folderName": {
          "description": "The name of the target folder that holds the desired files for this module.",
          "type": "string"
        },
        "moduleName": {
          "description": "The name of the Module to show in the extensions list in top comment",
          "type": "string"
        },
        "outputOrder": {
          "description": "The order of which the files are to be included in the file",
          "type": "number"
        }
      },
      "required": [
        "abbr",
        "moduleName",
        "outputOrder"
      ],
      "type": "object"
    }
  },
  "properties": {
    "cacheDuration": {
      "description": "The length of time that the files will be valid for in seconds",
      "type": "number"
    },
    "cacheSize": {
      "description": "The number of files that will be stored in the cache at any given time.",
      "type": "number"
    },
    "elements": {
      "description": "All of the modules that may be included in to build file.",
      "items": {
        "$ref": "#/definitions/IElements"
      },
      "type": "array"
    },
    "fileExtensions": {
      "description": "A list of the potential file types that could be requested.",
      "items": {
        "type": "string"
      },
      "type": "array"
    },
    "fileNames": {
      "description": "A list of the permitted names of files to be requested from the builder.",
      "items": {
        "type": "string"
      },
      "type": "array"
    },
    "headerContent": {
      "description": "The message to be included at the top of the finished file.\n\nNOTE - THIS MUST REMAIN CONSISTENT OTHERWISE THE HASHES WILL CHANGE AND FAIL.",
      "type": "string"
    },
    "staticFileExtensions": {
      "description": "A list of the potential image file types that could be requested.",
      "items": {
        "type": "string"
      },
      "type": "array"
    },
    "packagesDir": {
      "description": "The location of the top level file containing all of the sub folders for build files.",
      "type": "string"
    },
    "requires": {
      "description": "A list of the orders that must appear in the request URL in order for a build to be succesful.",
      "items": {
        "type": "number"
      },
      "type": "array"
    },
    "separators": {
      "description": "An array of strings which the URL is to be split on.",
      "items": {
        "type": "string"
      },
      "type": "array"
    },
    "substitutions": {
      "additionalProperties": {
        "type": "string"
      },
      "defaultProperties": [
      ],
      "description": "Substitutions to be made throughout the built file.\n\nThere are 2 predefined _substitutions, _extensionURL and _extensionList.\nThese provide the build message with custom data relating to the file that has been requested.\nFor these properties only the value held is replaced by the value of an internal varaible.\nFor custom substitutions the property name is replaced by its value.",
      "type": "object"
    },
    "selectHack": {
      "type": "boolean",
      "description": "Indicates whether the select hack is in place"
    },
    "latestAll": {
      "type": "boolean",
      "description": "Indicates whether the latest versions of all modules can be requested"
    }
  },
  "required": [
    "cacheDuration",
    "cacheSize",
    "elements",
    "fileExtensions",
    "fileNames",
    "headerContent",
    "staticFileExtensions",
    "packagesDir",
    "requires",
    "separators",
    "substitutions"
  ],
  "type": "object"
};

export type ValidateFunction<T> = ((data: unknown) => data is T) & Pick<Ajv.ValidateFunction, 'errors'>
const rawValidateIConfig = ajv.compile(IConfigSchema) as ValidateFunction<IConfig>;

export default function (value: unknown): IConfig | string {
  if (rawValidateIConfig(value)) {
    return value;
  }

  return JSON.stringify(rawValidateIConfig.errors);
}
