#include <stdlib.h>
void test(int* input) {
    int* ptr;
    if ((ptr = input) != NULL) {
        int x = *ptr; // OK
    }
}