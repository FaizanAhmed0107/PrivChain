pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

template AgeVerifier() {
    // Private Inputs
    signal input birthdate; 
    signal input salt;      

    // Public Inputs
    signal input commitment;  
    signal input thresholdDate; 

    component hasher = Poseidon(2);
    hasher.inputs[0] <== birthdate;
    hasher.inputs[1] <== salt;
    
    commitment === hasher.out;

    component le = LessEqThan(64); 
    le.in[0] <== birthdate;
    le.in[1] <== thresholdDate;

    le.out === 1; 
}

component main {public [commitment, thresholdDate]} = AgeVerifier();
