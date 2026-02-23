#include <stdlib.h>
void test(int* a, int* b, int cond) {
    int* target = cond ? a : b;
    if (target != NULL) {
        *target = 10; 
    }
}