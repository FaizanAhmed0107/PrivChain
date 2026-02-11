
// @ts-ignore
export async function generateProof(birthdate: number, salt: string) {
    // @ts-ignore
    const snarkjs = await import('snarkjs');

    // threshold: 18 years ago from today
    // birthdate must be <= threshold (older than 18)
    const now = Math.floor(Date.now() / 1000);
    const thresholdDate = now - (18 * 365 * 24 * 60 * 60);

    const input = {
        birthdate: birthdate,
        salt: salt,
        thresholdDate: thresholdDate,
        commitment: await generateCommitment(birthdate, salt),
    };

    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        input,
        "/zkp/credential.wasm",
        "/zkp/credential_final.zkey"
    );

    return { proof, publicSignals };
}

export async function generateCommitment(birthdate: number, salt: string) {
    // @ts-ignore
    const { buildPoseidon } = await import("circomlibjs");
    const poseidon = await buildPoseidon();

    const hash = poseidon([birthdate, salt]);
    // Convert to hex string for contract
    return poseidon.F.toString(hash);
}

export function generateSalt(): string {
    // Generate a large random number
    const array = new Uint32Array(4);
    if (typeof window !== 'undefined') {
        window.crypto.getRandomValues(array);
    } else {
        // Fallback for Node env if needed, or just return mock for build
        return "123456";
    }

    // Combine them
    let salt = BigInt(0);
    for (let i = 0; i < 4; i++) {
        salt = (salt << 32n) + BigInt(array[i]);
    }
    return salt.toString();
}

// Convert proof to Format expected by Solidity
export function exportSolidityProof(proof: any, publicSignals: any) {
    // snarkjs returns proof as object. Solidity expects uint[2] etc.
    // We can use snarkjs.groth16.exportSolidityCallData but that returns string.
    // simpler to parse it manually or use libraries.

    const pA = [proof.pi_a[0], proof.pi_a[1]];
    const pB = [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]];
    const pC = [proof.pi_c[0], proof.pi_c[1]];

    // publicSignals should be [commitment, threshold]

    return { pA, pB, pC, publicSignals };
}
