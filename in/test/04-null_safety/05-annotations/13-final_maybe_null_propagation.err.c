#pragma coral maybe-null final p
void possibly_clears(int** p);

#pragma coral_test expect PotentialNullDereferenceError
void test(int** ptr) {
    possibly_clears(ptr); 
    int x = **ptr; // ERR
}