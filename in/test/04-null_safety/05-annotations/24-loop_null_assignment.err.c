#include <stdlib.h>
#pragma coral_test expect PotencialNullDereferenceError
#pragma coral null p : not-null -> not-null
void test_loop_err(int* p, int count) {
    for(int i = 0; i < count; i++) {
        if (i == 5) p = NULL;
        *p = i; // ERR
    }
}