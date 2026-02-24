#pragma coral_test expect NullDereferenceError

#include <stdlib.h>
void test(int* ptr) {
    if (ptr != NULL) {
        ptr = NULL; 
        *ptr = 10; // ERR
    }
}