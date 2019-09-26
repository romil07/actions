"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const AzureServiceClient_1 = require("pipelines-appservice-lib/lib/ArmRest/AzureServiceClient");
const util = require("util");
class KeyVaultClient extends AzureServiceClient_1.ServiceClient {
    constructor(endpoint, timeOut, keyVaultName, keyVaultUrl) {
        super(endpoint, timeOut);
        this.apiVersion = "7.0";
        this.keyVaultUrl = keyVaultUrl;
    }
    invokeRequest(request) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                var response = yield this.beginRequest(request);
                if (response.statusCode == 401) {
                    var vaultResourceId = this.getValidVaultResourceId(response);
                    if (!!vaultResourceId) {
                        console.log(core.debug(util.format("RetryingWithVaultResourceIdFromResponse: %s", vaultResourceId)));
                        //this.getCredentials().activeDirectoryResourceId = vaultResourceId; // update vault resource Id
                        //this.getCredentials().getToken(true); // Refresh authorization token in cache
                        var response = yield this.beginRequest(request);
                    }
                }
                return response;
            }
            catch (exception) {
                throw exception;
            }
        });
    }
    getValidVaultResourceId(response) {
        if (!!response.headers) {
            var authenticateHeader = response.headers['www-authenticate'];
            if (!!authenticateHeader) {
                var parsedParams = authenticateHeader.split(",").map(pair => pair.split("=").map(function (item) {
                    return item.trim();
                }));
                const properties = {};
                parsedParams.forEach(([key, value]) => properties[key] = value);
                if (properties['resource']) {
                    return properties['resource'].split('"').join('');
                }
            }
        }
        return null;
    }
    getSecrets(nextLink, callback) {
        if (!callback) {
            core.debug("CallbackCannotBeNull");
            throw new Error("CallbackCannotBeNull");
        }
        // Create HTTP transport objects
        var url = nextLink;
        if (!url) {
            url = this.getRequestUriForbaseUrl(this.keyVaultUrl, '/secrets', {}, ['maxresults=25'], this.apiVersion);
        }
        var httpRequest = {
            method: 'GET',
            headers: {},
            uri: url,
        };
        console.log("DownloadingSecretsUsing", url);
        this.invokeRequest(httpRequest).then((response) => __awaiter(this, void 0, void 0, function* () {
            var result = [];
            if (response.statusCode == 200) {
                if (response.body.value) {
                    result = result.concat(response.body.value);
                }
                if (response.body.nextLink) {
                    var nextResult = yield this.accumulateResultFromPagedResult(response.body.nextLink);
                    if (nextResult.error) {
                        return new AzureServiceClient_1.ApiResult(nextResult.error);
                    }
                    result = result.concat(nextResult.result);
                    var listOfSecrets = this.convertToAzureKeyVaults(result);
                    return new AzureServiceClient_1.ApiResult(null, listOfSecrets);
                }
                else {
                    var listOfSecrets = this.convertToAzureKeyVaults(result);
                    return new AzureServiceClient_1.ApiResult(null, listOfSecrets);
                }
            }
            else {
                return new AzureServiceClient_1.ApiResult(AzureServiceClient_1.ToError(response));
            }
        })).then((apiResult) => callback(apiResult.error, apiResult.result), (error) => callback(error));
    }
    getSecretValue(secretName, callback) {
        if (!callback) {
            core.debug("CallbackCannotBeNull");
            throw new Error("CallbackCannotBeNull");
        }
        // Create HTTP transport objects
        var httpRequest = {
            method: 'GET',
            headers: {},
            uri: this.getRequestUriForbaseUrl(this.keyVaultUrl, '/secrets/{secretName}', {
                '{secretName}': secretName
            }, [], this.apiVersion)
        };
        console.log("DownloadingSecretValue", secretName);
        this.invokeRequest(httpRequest).then((response) => __awaiter(this, void 0, void 0, function* () {
            if (response.statusCode == 200) {
                var result = response.body.value;
                return new AzureServiceClient_1.ApiResult(null, result);
            }
            else if (response.statusCode == 400) {
                return new AzureServiceClient_1.ApiResult('GetSecretFailedBecauseOfInvalidCharacters', secretName);
            }
            else {
                return new AzureServiceClient_1.ApiResult(AzureServiceClient_1.ToError(response));
            }
        })).then((apiResult) => callback(apiResult.error, apiResult.result), (error) => callback(error));
    }
    convertToAzureKeyVaults(result) {
        var listOfSecrets = [];
        result.forEach((value, index) => {
            var expires;
            if (value.attributes.exp) {
                expires = new Date(0);
                expires.setSeconds(parseInt(value.attributes.exp));
            }
            var secretIdentifier = value.id;
            var lastIndex = secretIdentifier.lastIndexOf("/");
            var name = secretIdentifier.substr(lastIndex + 1, secretIdentifier.length);
            var azkvSecret = {
                name: name,
                contentType: value.contentType,
                enabled: value.attributes.enabled,
                expires: expires
            };
            listOfSecrets.push(azkvSecret);
        });
        return listOfSecrets;
    }
}
exports.KeyVaultClient = KeyVaultClient;
