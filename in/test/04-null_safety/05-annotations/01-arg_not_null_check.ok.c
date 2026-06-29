#include <stdlib.h>
#pragma coral null p : not-null -> not-null
void process(int* p);

void test(int* ptr) {
    if (ptr != NULL) {
        process(ptr); // OK
    }
}