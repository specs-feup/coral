#pragma coral_test expect PotentialNullDereferenceError

void possibly_clears(int** p);

#pragma coral null ptr {*ptr: not-null -> maybe-null} : not-null -> maybe-null
void test(int** ptr) {
    int a = **ptr; // ok
    possibly_clears(ptr); 
    int x = **ptr; // ERR
}