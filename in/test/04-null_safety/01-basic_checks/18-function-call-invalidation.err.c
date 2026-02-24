#pragma coral_test expect NullDereferenceError

#include <stdlib.h>
void modify(int** p) { *p = 0; }
void test(int* ptr) {
    if (ptr != NULL) {
        modify(&ptr); 
        int x = *ptr; // ERR
    }
}