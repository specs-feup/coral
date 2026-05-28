#include <stdlib.h>
int test(int *p) {
    int val = (p != 0) ? *p : 0; // OK
    return val;
}