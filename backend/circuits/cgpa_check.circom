pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

/*
    CGPAVerifier: Proves that a user's CGPA is greater than or equal to a threshold.
    SCALING: Inputs should be scaled to integers (e.g., multiplied by 100).
    Example: 8.5 CGPA -> 850.
*/
template CGPAVerifier() {
    // 1. Private Inputs (The Secret Data)
    signal input cgpa;      // The actual CGPA (scaled)
    signal input salt;      // Random number used for blinding

    // 2. Public Inputs (What everyone sees/verifies against)
    signal input commitment;    // The hash stored on the blockchain/registry
    signal input threshold;     // The minimum required CGPA (scaled)

    // Step A: Verify the Hash matches the Commitment
    // commitment === Poseidon(cgpa, salt)
    component hasher = Poseidon(2);
    hasher.inputs[0] <== cgpa;
    hasher.inputs[1] <== salt;
    
    commitment === hasher.out;

    // Step B: Verify CGPA condition
    // cgpa >= threshold
    // Using 64 bits to be safe, though 32 is likely enough for CGPA
    component ge = GreaterEqThan(64); 
    ge.in[0] <== cgpa;
    ge.in[1] <== threshold;

    ge.out === 1; // Assertion: must be true
}

// Public inputs are what the smart contract will verify against
component main {public [commitment, threshold]} = CGPAVerifier();
