#include <assert.h>
#include <stdlib.h>
void test(int* ptr) {
    assert(ptr != NULL);
    int x = *ptr; // OK
}