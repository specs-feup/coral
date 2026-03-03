#pragma coral_test expect NullDereferenceError

#include <stdlib.h>

void target(int *p) {
    #pragma coral not-null p
    *p = 100; 
}

void caller() {
    int *ptr = 0;

    target(ptr); //err
}