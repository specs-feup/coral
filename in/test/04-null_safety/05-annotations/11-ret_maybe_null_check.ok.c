#include <stdlib.h>
#pragma coral maybe-null return
int* try_get_ptr();

void test() {
    int* p = try_get_ptr();
    if (p != NULL) {
        int val = *p; // OK
    }
}