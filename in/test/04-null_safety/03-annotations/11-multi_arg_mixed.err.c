#pragma coral_test expect NullDereferenceError
#pragma coral null a : not-null -> maybe-null
#pragma coral null b : null -> maybe-null
void test_mixed(int *a, int *b) {
    *a = 1; // OK
    *b = 2; // ERR
}