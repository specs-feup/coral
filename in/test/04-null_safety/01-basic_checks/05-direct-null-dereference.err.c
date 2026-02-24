#pragma coral_test expect NullDereferenceError
#include <stdlib.h>
void test() {
    int* ptr = NULL;
    int val = *ptr; 
}