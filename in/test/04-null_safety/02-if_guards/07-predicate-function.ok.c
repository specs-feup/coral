#include <stdlib.h>
int is_valid(int* p) { return p != NULL; }
void test(int* ptr) {
    if (is_valid(ptr)) {
        int x = *ptr; // OK
    }
}