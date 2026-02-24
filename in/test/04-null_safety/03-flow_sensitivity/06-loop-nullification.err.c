#pragma coral_test expect PotentialNullDereferenceError

#include <stdlib.h>
void test(int *ptr) {
    while (ptr != NULL) {
        ptr = get_maybe_null(); 
        int x = *ptr; // ERR
    }
}