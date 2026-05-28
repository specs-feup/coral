#pragma coral_test expect PotentialNullDereferenceError
#include <stdlib.h>
void test() {
    int *ptr = malloc(sizeof(int));
    // ERR
    *ptr = 10; 
}