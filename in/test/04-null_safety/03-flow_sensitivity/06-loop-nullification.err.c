#pragma coral_test expect PotentialNullDereferenceError

#include <stdlib.h>
int * get_maybe_null(){
    return malloc(sizeof(int));
}
void test(int *ptr) {
    while (ptr != NULL) {
        ptr = get_maybe_null(); 
        int x = *ptr; // ERR
    }
}