#include <stdlib.h>
#pragma coral_test expect NullDereferenceError
#pragma coral not-null p
void test_loop_err(int* p, int count) {
    for(int i = 0; i < count; i++) {
        if (i == 5) p = NULL;
        *p = i; // ERR
    }
}