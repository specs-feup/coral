#include <stdlib.h>
void test(int* ptr) {
    if (!ptr) return; //exit(1);
    *ptr = 10; // OK
}