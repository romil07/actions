import util = require("util");
import * as core from '@actions/core';

export class KeyVaultActionParameters {

    public keyVaultName: string;
    public secretsFilter: string;
    public keyVaultUrl: string;
    public scheme: string;

    public getKeyVaultActionParameters() : KeyVaultActionParameters {
        this.keyVaultName = core.getInput("keyvault");
        this.secretsFilter = core.getInput("secrets");

        if (!this.keyVaultName) {
            console.log("Vault name not provided.");
            core.setFailed("Vault name not provided.");
        }

        if (!this.secretsFilter) {
            console.log("Secret filter not provided.");
            core.setFailed("Secret filter not provided.");
        }

        var azureKeyVaultDnsSuffix = "vault.azure.net";
        this.keyVaultUrl = util.format("https://%s.%s", this.keyVaultName, azureKeyVaultDnsSuffix);
        return this;
    }
}