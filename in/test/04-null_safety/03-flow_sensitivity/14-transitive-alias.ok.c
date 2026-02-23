#include <stdlib.h>
void test(int* a, int* b, int* c) {
    if (a == b && b == c) {
        if (a != NULL) {
            int val = *c; // OK
        }
    }
}