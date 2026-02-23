#include <stdlib.h>
void test(int* a) {
    int* b = a;
    if (a != NULL) {
        int x = *b; // OK
    }
}