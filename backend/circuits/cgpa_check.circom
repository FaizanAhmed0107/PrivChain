pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

template CGPAVerifier() {
    // Private Inputs
    signal input cgpa;      
    signal input salt;     

    // Public Inputs 
    signal input commitment;    
    signal input threshold;    

    component hasher = Poseidon(2);
    hasher.inputs[0] <== cgpa;
    hasher.inputs[1] <== salt;
    
    commitment === hasher.out;

    component ge = GreaterEqThan(64); 
    ge.in[0] <== cgpa;
    ge.in[1] <== threshold;

    ge.out === 1; 
}

component main {public [commitment, threshold]} = CGPAVerifier();
