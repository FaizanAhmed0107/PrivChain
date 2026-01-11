pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

template AgeVerifier() {
    // 1. Private Inputs (The Secret Data)
    signal input birthdate; // e.g., Unix timestamp
    signal input salt;      // Random number used for blinding

    // 2. Public Inputs (What everyone sees/verifies against)
    signal input commitment;    // The hash stored on the blockchain
    signal input thresholdDate; // The cutoff date (e.g., 18 years ago). birthdate must be <= thresholdDate (older = smaller timestamp)

    // Step A: Verify the Hash matches the Commitment
    // commitment === Poseidon(birthdate, salt)
    component hasher = Poseidon(2);
    hasher.inputs[0] <== birthdate;
    hasher.inputs[1] <== salt;
    
    commitment === hasher.out;

    // Step B: Verify Age condition
    // birthdate <= thresholdDate
    // Using 64 bits which is enough for Unix timestamps
    component le = LessEqThan(64); 
    le.in[0] <== birthdate;
    le.in[1] <== thresholdDate;

    le.out === 1; // Assertion: must be true
}

// Public inputs are what the smart contract will verify against
component main {public [commitment, thresholdDate]} = AgeVerifier();
