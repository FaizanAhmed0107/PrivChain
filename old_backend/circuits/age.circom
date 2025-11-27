pragma circom 2.0.0;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "../node_modules/circomlib/circuits/comparators.circom";

template AgeCheck() {
    // Private Inputs (User keeps these secret)
    signal input birthYear;
    signal input salt; 

    // Public Inputs (Blockchain sees these)
    signal input ageThreshold; 
    signal input currentYear;
    signal input hashCommitment;

    // 1. Verify Age: (currentYear - birthYear) > ageThreshold
    component gt = GreaterThan(32);
    gt.in[0] <== currentYear - birthYear;
    gt.in[1] <== ageThreshold;
    gt.out === 1;

    // 2. Verify Identity: Hash(birthYear, salt) == hashCommitment
    component hasher = Poseidon(2);
    hasher.inputs[0] <== birthYear;
    hasher.inputs[1] <== salt;
    hasher.out === hashCommitment;
}

component main {public [ageThreshold, currentYear, hashCommitment]} = AgeCheck();