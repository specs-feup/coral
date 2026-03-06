#pragma coral_test expect PotentialNullDereferenceError
#pragma coral maybe-null return
int* try_alloc();

void test() {
    int* res = try_alloc();
    int x = *res; // ERR
}