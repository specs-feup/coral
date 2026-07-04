#pragma coral_test expect PotentialNullDereferenceError

void costume_fn (int * q);

#pragma coral null p : not-null -> not-null
void test_invalidation(int* p) {
    int* q = p;
    costume_fn(q);
    *p = 10; // OK
    *q = 20; // ERR
}