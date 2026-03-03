#include <stdlib.h>

void test(int *p, int *q) {
    if (p != NULL && *p > 10) { 
        *p=10;
    }
}