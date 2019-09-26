"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const KeyVaultClient_1 = require("./KeyVaultClient");
const util = require("util");
class AzureKeyVaultSecret {
}
exports.AzureKeyVaultSecret = AzureKeyVaultSecret;
class KeyVaultHelper {
    constructor(endpoint, timeOut, keyVaultActionParameters) {
        this.keyVaultActionParameters = keyVaultActionParameters;
        this.keyVaultClient = new KeyVaultClient_1.KeyVaultClient(endpoint, 100, keyVaultActionParameters.keyVaultName, keyVaultActionParameters.keyVaultUrl);
    }
    downloadSecrets() {
        var downloadAllSecrets = false;
        if (this.keyVaultActionParameters.secretsFilter && this.keyVaultActionParameters.secretsFilter.length === 1 && this.keyVaultActionParameters.secretsFilter[0] === "*") {
            downloadAllSecrets = true;
        }
        else {
            downloadAllSecrets = true;
        }
        // console.log(core.loc("SubscriptionIdLabel", this.keyVaultActionParameters.subscriptionId));
        // console.log(core.loc("KeyVaultNameLabel", this.keyVaultActionParameters.keyVaultName));
        // Key vault task explicitly handles multi line masking - hence setting SYSTEM_UNSAFEALLOWMULTILINESECRET to true
        // core.setVariable("SYSTEM_UNSAFEALLOWMULTILINESECRET", "true");
        if (downloadAllSecrets) {
            return this.downloadAllSecrets();
        }
        else {
            return this.downloadSelectedSecrets(this.keyVaultActionParameters.secretsFilter);
        }
    }
    downloadAllSecrets() {
        core.debug(util.format("Downloading all secrets from subscriptionId: %s, vault: %s", this.keyVaultActionParameters.subscriptionId, this.keyVaultActionParameters.keyVaultName));
        return new Promise((resolve, reject) => {
            this.keyVaultClient.getSecrets("", (error, listOfSecrets, request, response) => {
                if (error) {
                    return reject(core.debug(util.format("GetSecretsFailed \n%s", this.getError(error))));
                }
                if (listOfSecrets.length == 0) {
                    core.debug(util.format("No secrets found in the vault %s", this.keyVaultActionParameters.keyVaultName));
                    return resolve();
                }
                //console.log(tl.loc("NumberOfSecretsFound", this.taskParameters.keyVaultName, listOfSecrets.length));
                listOfSecrets = this.filterDisabledAndExpiredSecrets(listOfSecrets);
                //console.log(tl.loc("NumberOfEnabledSecretsFound", this.taskParameters.keyVaultName, listOfSecrets.length));
                var getSecretValuePromises = [];
                listOfSecrets.forEach((secret, index) => {
                    getSecretValuePromises.push(this.downloadSecretValue(secret.name));
                });
                Promise.all(getSecretValuePromises).then(() => {
                    return resolve();
                });
            });
        });
    }
    downloadSelectedSecrets(secretsFilter) {
        core.debug(util.format("Downloading selected secrets from subscriptionId: %s, vault: %s", this.keyVaultActionParameters.subscriptionId, this.keyVaultActionParameters.keyVaultName));
        let selectedSecrets = [];
        return new Promise((resolve, reject) => {
            var getSecretValuePromises = [];
            selectedSecrets.forEach((secretName, index) => {
                getSecretValuePromises.push(this.downloadSecretValue(secretName));
            });
            Promise.all(getSecretValuePromises).then(() => {
                return resolve();
            });
        });
    }
    downloadSecretValue(secretName) {
        core.debug(util.format("Promise for downloading secret value for: %s", secretName));
        secretName = secretName.trim();
        return new Promise((resolve, reject) => {
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
    setVaultVariable(secretName, secretValue) {
        if (!secretValue) {
            return;
        }
        // Support multiple stages using different key vaults with the same secret name but with different version identifiers
        let secretNameWithoutVersion = secretName.split("/")[0];
        // single-line case
        core.exportSecret(secretNameWithoutVersion, secretValue);
        core.exportSecret(secretName, secretValue);
    }
    filterDisabledAndExpiredSecrets(listOfSecrets) {
        var result = [];
        var now = new Date();
        listOfSecrets.forEach((value, index) => {
            if (value.enabled && (!value.expires || value.expires > now)) {
                result.push(value);
            }
        });
        return result;
    }
    tryFlattenJson(jsonString) {
        try {
            var o = JSON.parse(jsonString);
            if (o && typeof o === "object") {
                return JSON.stringify(o);
            }
        }
        catch (e) { }
        return "";
    }
    getError(error) {
        core.debug(JSON.stringify(error));
        if (error && error.message) {
            return error.message;
        }
        return error;
    }
}
exports.KeyVaultHelper = KeyVaultHelper;
