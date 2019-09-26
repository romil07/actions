import * as core from '@actions/core';
import { KeyVaultActionParameters } from './KeyVaultActionParameters';
import { getHandler } from 'pipelines-appservice-lib/lib/AuthorizationHandlerFactory';
import { KeyVaultHelper } from './KeyVaultHelper';

async function run() {
    try {
        var actionParameters = new KeyVaultActionParameters().getKeyVaultActionParameters();
        var keyVaultHelper = new KeyVaultHelper(getHandler(), 100, actionParameters);
        keyVaultHelper.downloadSecrets();
        
    } catch (error) {
        core.setFailed(error.message);
    }
}

run();