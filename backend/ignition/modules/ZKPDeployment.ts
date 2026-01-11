import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ZKPDeploymentModule", (m) => {
    // 1. Deploy the Verifier Logic Library (Contract)
    const verifier = m.contract("Groth16Verifier");

    // 2. Deploy Registry, passing the Verifier's address
    const credentialRegistry = m.contract("CredentialRegistry", [verifier]);

    return { verifier, credentialRegistry };
});
