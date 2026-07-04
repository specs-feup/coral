#pragma coral_test expect PotentialNullDereferenceError

#include <stdlib.h>
int* try_get_ptr();

void test() {
    int* p = try_get_ptr();
    int val = *p; // ERR
}