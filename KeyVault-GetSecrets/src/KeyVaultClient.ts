import * as core from '@actions/core';
import { IAuthorizationHandler } from "pipelines-appservice-lib/lib/ArmRest/IAuthorizationHandler";
import { ApiResult, ServiceClient, ApiCallback, ToError } from 'pipelines-appservice-lib/lib/ArmRest/AzureServiceClient';
import { KeyVaultActionParameters } from "./KeyVaultActionParameters";
import { WebRequest, WebResponse } from "pipelines-appservice-lib/lib/webClient";
import util = require("util");
import { AzureKeyVaultSecret } from "./KeyVaultHelper";

export class KeyVaultClient extends ServiceClient {    
    private keyVaultUrl: string;
    private apiVersion: string = "7.0";
    
    constructor(endpoint: IAuthorizationHandler, timeOut: number, keyVaultName: string, keyVaultUrl: string) {
        super(endpoint, timeOut);
        this.keyVaultUrl = keyVaultUrl;
    }

    public async invokeRequest(request: WebRequest): Promise<WebResponse> {
        try {
            var response = await this.beginRequest(request);
            if (response.statusCode == 401) {
                var vaultResourceId = this.getValidVaultResourceId(response);
                if(!!vaultResourceId) {
                    console.log(core.debug(util.format("RetryingWithVaultResourceIdFromResponse: %s", vaultResourceId)));
                    
                    //this.getCredentials().activeDirectoryResourceId = vaultResourceId; // update vault resource Id
                    //this.getCredentials().getToken(true); // Refresh authorization token in cache
                    var response = await this.beginRequest(request);
                }
            }
            return response;
        } catch(exception) {
            throw exception;
        }
    }

    public getValidVaultResourceId(response: WebResponse) {
        if (!!response.headers) {
            var authenticateHeader = response.headers['www-authenticate'];
            if (!!authenticateHeader) {
                var parsedParams = authenticateHeader.split(",").map(pair => pair.split("=").map(function(item) {
                    return item.trim();
                }));

                const properties = {};
                parsedParams.forEach(([key,value]) => properties[key] = value);
                if(properties['resource']) {
                    return properties['resource'].split('"').join('');
                }
            }
        }

        return null;
    }
    
    public getSecrets(nextLink: string, callback: ApiCallback) {
        if (!callback) {
            core.debug("CallbackCannotBeNull");
            throw new Error("CallbackCannotBeNull");
        }

        // Create HTTP transport objects
        var url = nextLink;
        if (!url)
        {
            url = this.getRequestUriForbaseUrl(
                this.keyVaultUrl,
                '/secrets',
                {},
                ['maxresults=25'],
                this.apiVersion);
        }

        var httpRequest: WebRequest = {
            method: 'GET',
            headers: {},
            uri: url,
        }
        

        console.log("DownloadingSecretsUsing", url);
        
        this.invokeRequest(httpRequest).then(async (response: WebResponse) => {
            var result = [];
            if (response.statusCode == 200) {
                if (response.body.value) {
                    result = result.concat(response.body.value);
                }
                
                if (response.body.nextLink) {
                    var nextResult = await this.accumulateResultFromPagedResult(response.body.nextLink);
                    if (nextResult.error) {
                        return new ApiResult(nextResult.error);
                    }
                    result = result.concat(nextResult.result);

                    var listOfSecrets = this.convertToAzureKeyVaults(result);
                    return new ApiResult(null, listOfSecrets);
                }
                else {
                    var listOfSecrets = this.convertToAzureKeyVaults(result);
                    return new ApiResult(null, listOfSecrets);
                }
            }
            else {
                return new ApiResult(ToError(response));
            }
        }).then((apiResult: ApiResult) => callback(apiResult.error, apiResult.result),
            (error) => callback(error));
    }

    public getSecretValue(secretName: string, callback: ApiCallback) {
        if (!callback) {
            core.debug("CallbackCannotBeNull");
            throw new Error("CallbackCannotBeNull");
        }

        // Create HTTP transport objects
        var httpRequest: WebRequest = {
            method: 'GET',
            headers: {},
            uri: this.getRequestUriForbaseUrl(
                this.keyVaultUrl,
                '/secrets/{secretName}',
                {
                    '{secretName}': secretName
                },
                [],
                this.apiVersion
            )
        };        

        console.log("DownloadingSecretValue", secretName);
        this.invokeRequest(httpRequest).then(async (response: WebResponse) => {
            if (response.statusCode == 200) {
                var result = response.body.value;
                return new ApiResult(null, result);
            }
            else if (response.statusCode == 400) {
                return new ApiResult('GetSecretFailedBecauseOfInvalidCharacters', secretName);
            }
            else {
                return new ApiResult(ToError(response));
            }
        }).then((apiResult: ApiResult) => callback(apiResult.error, apiResult.result),
            (error) => callback(error));
    }

    private convertToAzureKeyVaults(result: any[]): AzureKeyVaultSecret[] {
        var listOfSecrets: AzureKeyVaultSecret[] = [];
        result.forEach((value: any, index: number) => {
            var expires;
            if (value.attributes.exp)
            {
                expires = new Date(0);
                expires.setSeconds(parseInt(value.attributes.exp));
            }

            var secretIdentifier: string = value.id;
            var lastIndex = secretIdentifier.lastIndexOf("/");
            var name: string = secretIdentifier.substr(lastIndex + 1, secretIdentifier.length);

            var azkvSecret: AzureKeyVaultSecret = {
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