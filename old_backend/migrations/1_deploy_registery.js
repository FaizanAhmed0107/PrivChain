const CredentialRegistry = artifacts.require("CredentialRegistry");

export default function (_deployer) {
    _deployer.deploy(CredentialRegistry);
};
