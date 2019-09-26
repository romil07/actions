import util = require("util");
import * as core from '@actions/core';

export class KeyVaultActionParameters {

    public subscriptionId: string;
    public keyVaultName: string;
    public secretsFilter: string;
    public keyVaultUrl: string;
    public servicePrincipalId: string;
    public scheme: string;

    private _environments = {
        'AzureStack': 'azurestack'
    }

    public getKeyVaultActionParameters() : KeyVaultActionParameters {
        this.subscriptionId = core.getInput("subscriptionId");
        this.keyVaultName = core.getInput("keyvault-name");
        this.secretsFilter = core.getInput("secretsFilter");
        var azureKeyVaultDnsSuffix = "vault.azure.net";
        this.servicePrincipalId = core.getInput("servicePrincipalId");
        this.keyVaultUrl = util.format("https://%s.%s", this.keyVaultName, azureKeyVaultDnsSuffix);
        return this;
    }
}