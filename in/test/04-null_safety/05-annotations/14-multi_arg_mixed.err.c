#pragma coral_test expect PotentialNullDereferenceError
#pragma coral not-null a
#pragma coral maybe-null b
void test_mixed(int *a, int *b) {
    *a = 1; // OK
    *b = 2; // ERR
}