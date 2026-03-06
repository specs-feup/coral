#pragma coral_test expect PotentialNullDereferenceError
#pragma coral not-null p
void test_invalidation(int* p) {
    int* q = p;
    #pragma coral maybe-null q
    *p = 10; // OK
    *q = 20; // ERR
}