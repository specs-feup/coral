#pragma coral_test expect NullDereferenceError
#include <stdlib.h>

void test(int *p, int *q) {
    int cond = (p != NULL); 
    p = q; 
    if (cond) {
        *p = 10; // ERR 
    }
}