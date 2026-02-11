
// @ts-ignore
export async function generateCGPAProof(cgpa: number, salt: string, threshold: number) {
    // @ts-ignore
    const snarkjs = await import('snarkjs');

    // Scaling: multiply by 100 to handle 2 decimal places (e.g., 8.5 -> 850)
    // The circuit expects scaled integers.
    const scaledCGPA = Math.floor(cgpa * 100);
    const scaledThreshold = Math.floor(threshold * 100);

    const input = {
        cgpa: scaledCGPA,
        salt: salt,
        threshold: scaledThreshold,
        commitment: await generateCGPACommitment(cgpa, salt),
    };

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        "/zkp/cgpa_check.wasm",
        "/zkp/cgpa_check_final.zkey"
    );

    return { proof, publicSignals };
}

export async function generateCGPACommitment(cgpa: number, salt: string) {
    // @ts-ignore
    const { buildPoseidon } = await import("circomlibjs");
    const poseidon = await buildPoseidon();

    const scaledCGPA = Math.floor(cgpa * 100);
    const hash = poseidon([scaledCGPA, salt]);
    // Convert to hex string for contract
    return poseidon.F.toString(hash);
}
