#pragma coral_test expect NullDereferenceError
#include <stdlib.h>
void test(int* input) {
    int* ptr = input;
    ptr = NULL;
    int val = *ptr; 
}