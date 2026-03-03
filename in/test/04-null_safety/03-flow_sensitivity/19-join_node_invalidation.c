#pragma coral_test expect PotentialNullDereferenceError

#include <stdlib.h>

#pragma coral safe
void test(int *p) {
    
    if (p != NULL) {
        *p = 10; // OK
    } 

    *p = 20; // maybe null
}