#pragma coral_test expect NullDereferenceError
#include <stdlib.h>

void test(int *p) {
    #pragma coral not-null p
    
    p = 0;
    
    if (p == 0) {

        int x = *p; // ERR
    }
}