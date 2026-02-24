#pragma coral_test expect PotentialNullDereferenceError
#include <stdlib.h>
void test(int* ptr) {
    int x = *ptr;
}
