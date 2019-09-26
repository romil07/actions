import util = require("util");
import * as core from '@actions/core';

export class KeyVaultActionParameters {

    public keyVaultName: string;
    public secretsFilter: string;
    public keyVaultUrl: string;
    public scheme: string;

    public getKeyVaultActionParameters() : KeyVaultActionParameters {
        this.keyVaultName = core.getInput("keyvault-name");
        this.secretsFilter = core.getInput("secretsFilter");
        var azureKeyVaultDnsSuffix = "vault.azure.net";
        this.keyVaultUrl = util.format("https://%s.%s", this.keyVaultName, azureKeyVaultDnsSuffix);
        return this;
    }
}