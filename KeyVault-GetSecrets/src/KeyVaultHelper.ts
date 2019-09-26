import { IAuthorizationHandler } from "pipelines-appservice-lib/lib/ArmRest/IAuthorizationHandler";
import { KeyVaultActionParameters } from "./KeyVaultActionParameters";
import * as core from '@actions/core';
import { KeyVaultClient } from "./KeyVaultClient";
import util = require("util");

export class AzureKeyVaultSecret {
    name: string;
    enabled: boolean;
    expires: Date | undefined;
    contentType: string;
}

export class KeyVaultHelper {

    private keyVaultActionParameters: KeyVaultActionParameters;
    private keyVaultClient: KeyVaultClient;

    constructor(endpoint: IAuthorizationHandler, timeOut: number, keyVaultActionParameters: KeyVaultActionParameters) {
        this.keyVaultActionParameters = keyVaultActionParameters;
        this.keyVaultClient = new KeyVaultClient(endpoint, 100, keyVaultActionParameters.keyVaultName, keyVaultActionParameters.keyVaultUrl);
    }

    public downloadSecrets(): Promise<void> {
        var downloadAllSecrets = false;
        if (this.keyVaultActionParameters.secretsFilter && this.keyVaultActionParameters.secretsFilter.length === 1 && this.keyVaultActionParameters.secretsFilter[0] === "*") {
            downloadAllSecrets = true;
        } else {
            downloadAllSecrets = true;
        }

        // console.log(core.loc("SubscriptionIdLabel", this.keyVaultActionParameters.subscriptionId));
        // console.log(core.loc("KeyVaultNameLabel", this.keyVaultActionParameters.keyVaultName));

        // Key vault task explicitly handles multi line masking - hence setting SYSTEM_UNSAFEALLOWMULTILINESECRET to true
        // core.setVariable("SYSTEM_UNSAFEALLOWMULTILINESECRET", "true");

        if (downloadAllSecrets) {
            return this.downloadAllSecrets();
        } else {
            return this.downloadSelectedSecrets(this.keyVaultActionParameters.secretsFilter);
        }
    }

    private downloadAllSecrets(): Promise<void> {
        core.debug(util.format("Downloading all secrets from subscriptionId: %s, vault: %s", this.keyVaultActionParameters.subscriptionId, this.keyVaultActionParameters.keyVaultName));

        return new Promise<void>((resolve, reject) => {
            this.keyVaultClient.getSecrets("", (error, listOfSecrets, request, response) => {
                if (error) {
                    return reject(core.debug(util.format("GetSecretsFailed \n%s", this.getError(error))));
                }

                if (listOfSecrets.length == 0) {
                    core.debug(util.format("No secrets found in the vault %s", this.keyVaultActionParameters.keyVaultName))
                    return resolve();
                }

                //console.log(tl.loc("NumberOfSecretsFound", this.taskParameters.keyVaultName, listOfSecrets.length));
                listOfSecrets = this.filterDisabledAndExpiredSecrets(listOfSecrets);
                //console.log(tl.loc("NumberOfEnabledSecretsFound", this.taskParameters.keyVaultName, listOfSecrets.length));

                var getSecretValuePromises: Promise<any>[] = [];
                listOfSecrets.forEach((secret: AzureKeyVaultSecret, index: number) => {
                    getSecretValuePromises.push(this.downloadSecretValue(secret.name));
                });

                Promise.all(getSecretValuePromises).then(() =>{
                    return resolve();
                });
            });
        });
    }

    private downloadSelectedSecrets(secretsFilter: string): Promise<void> {
        core.debug(util.format("Downloading selected secrets from subscriptionId: %s, vault: %s", this.keyVaultActionParameters.subscriptionId, this.keyVaultActionParameters.keyVaultName));

        let selectedSecrets: string[] = [];
        return new Promise<void>((resolve, reject) => {
            var getSecretValuePromises: Promise<any>[] = [];
            selectedSecrets.forEach((secretName: string, index: number) => {
                getSecretValuePromises.push(this.downloadSecretValue(secretName));
            });

            Promise.all(getSecretValuePromises).then(() =>{
                return resolve();
            });
        });
    }

    private downloadSecretValue(secretName: string): Promise<any> {
        core.debug(util.format("Promise for downloading secret value for: %s", secretName));
        secretName = secretName.trim();

        return new Promise<void>((resolve, reject) => {
            this.keyVaultClient.getSecretValue(secretName, (error, secretValue, request, response) => {
                if (error) {
                    let errorMessage = this.getError(error);
                }
                else {
                    this.setVaultVariable(secretName, secretValue);
                }
                
                return resolve();
            });
        });
    }

    private setVaultVariable(secretName: string, secretValue: string): void {
        if (!secretValue) {
            return;
        }

        // Support multiple stages using different key vaults with the same secret name but with different version identifiers
        let secretNameWithoutVersion = secretName.split("/")[0];

        // single-line case
        core.exportSecret(secretNameWithoutVersion, secretValue);
        core.exportSecret(secretName, secretValue);
        
    }

    private filterDisabledAndExpiredSecrets(listOfSecrets: AzureKeyVaultSecret[]): AzureKeyVaultSecret[] {
        var result: AzureKeyVaultSecret[] = [];
        var now: Date = new Date();

        listOfSecrets.forEach((value: AzureKeyVaultSecret, index: number) => {
            if (value.enabled && (!value.expires || value.expires > now)) {
                result.push(value);
            }
        });
        
        return result;
    }

    private tryFlattenJson(jsonString: string): string {
        try {
            var o = JSON.parse(jsonString);
            if (o && typeof o === "object") {
                return JSON.stringify(o);
            }
        }
        catch (e) { }

        return "";
    }

    private getError(error: any): any {
        core.debug(JSON.stringify(error));

        if (error && error.message) {
            return error.message;
        }

        return error;
    }
}