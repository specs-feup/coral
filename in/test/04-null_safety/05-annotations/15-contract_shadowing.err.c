#pragma coral_test expect PotentialNullDereferenceError
#pragma coral not-null p
void test_shadow(int *p) {
    if (1) {
        #pragma coral maybe-null p 
        int x = *p; // ERR
    }
}