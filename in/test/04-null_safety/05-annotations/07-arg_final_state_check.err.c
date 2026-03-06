#pragma coral_test expect PotentialNullDereferenceError
#pragma coral maybe-null final p
void possibly_clears(int** p);

void test(int** ptr) {
    possibly_clears(ptr);
    int x = **ptr; // ERR
}