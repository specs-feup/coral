#include <stdlib.h>
void test(int* ptr, int cond) {
    if (cond) {
        if (!ptr) return;
    } else {
        if (ptr == NULL) exit(1);
    }
    *ptr = 100;
}