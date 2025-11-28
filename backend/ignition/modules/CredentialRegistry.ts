import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("CredentialRegistryModule", (m) => {
    const credentialRegistry = m.contract("CredentialRegistry");

    return { credentialRegistry };
});
