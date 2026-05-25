#pragma coral_test expect NullDereferenceError
#include <stdlib.h>
void test() {
    int *ptr = malloc(sizeof(int));
    // ERR
    *ptr = 10; 
}