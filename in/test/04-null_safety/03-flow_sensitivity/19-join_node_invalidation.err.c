#pragma coral_test expect NullDereferenceError

#include <stdlib.h>

void test(int *p) {
    
    if (p != NULL) {
        *p = 10; // OK
    } 

    *p = 20; // maybe null
}