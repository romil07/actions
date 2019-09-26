import * as core from '@actions/core';
import * as crypto from "crypto";
import { getHandler } from 'azure-actions-webclient/lib/AuthorizationHandlerFactory';
import { IAuthorizationHandler } from 'azure-actions-webclient/lib/AuthHandler/IAuthorizationHandler';
import { KeyVaultActionParameters } from './KeyVaultActionParameters';
import { KeyVaultHelper } from './KeyVaultHelper';

var prefix = !!process.env.AZURE_HTTP_USER_AGENT ? `${process.env.AZURE_HTTP_USER_AGENT}` : "";
async function run() {
    try {
        let usrAgentRepo = crypto.createHash('sha256').update(`${process.env.GITHUB_REPOSITORY}`).digest('hex');
        let actionName = 'DeployWebAppToAzure';
        let userAgentString = (!!prefix ? `${prefix}+` : '') + `GITHUBACTIONS_${actionName}_${usrAgentRepo}`;
        core.exportVariable('AZURE_HTTP_USER_AGENT', userAgentString);

        var actionParameters = new KeyVaultActionParameters().getKeyVaultActionParameters();
        let handler: IAuthorizationHandler = await getHandler();
        // Yet to decide on the default timeout value.
        var keyVaultHelper = new KeyVaultHelper(handler, 100, actionParameters);
        core.debug("Downloading selected secrets");
        keyVaultHelper.downloadSecrets();
        
    } catch (error) {
        core.debug("Get secret failed with error: " + error);
        core.setFailed(error.message);
    }
    finally {
        core.exportVariable('AZURE_HTTP_USER_AGENT', prefix);
    }
}

run();