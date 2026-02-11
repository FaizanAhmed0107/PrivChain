import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ZKPDeploymentModule", (m) => {
    // 1. Deploy the Age Verifier (Original)
    const verifier = m.contract("Groth16Verifier");

    // 2. Deploy the CGPA Verifier (New)
    const cgpaVerifier = m.contract("CGPAVerifier");

    // 3. Deploy Registry, passing both verifiers
    const credentialRegistry = m.contract("CredentialRegistry", [verifier, cgpaVerifier]);

    return { verifier, cgpaVerifier, credentialRegistry };
});
