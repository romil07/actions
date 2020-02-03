"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("util");
const core = __importStar(require("@actions/core"));
class KeyVaultActionParameters {
    getKeyVaultActionParameters() {
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
exports.KeyVaultActionParameters = KeyVaultActionParameters;
