#include <stdlib.h>
void test(int* ptr) {
    if (!ptr) exit(1);
    *ptr = 10; // OK
}