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
        this.keyVaultName = core.getInput("keyvault-name");
        this.secretsFilter = core.getInput("secret-name");
        var azureKeyVaultDnsSuffix = "vault.azure.net";
        this.keyVaultUrl = util.format("https://%s.%s", this.keyVaultName, azureKeyVaultDnsSuffix);
        console.log("KeyVualt Url: " + this.keyVaultUrl);
        return this;
    }
}
exports.KeyVaultActionParameters = KeyVaultActionParameters;
