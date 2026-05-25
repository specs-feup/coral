#pragma coral_test expect NullDereferenceError

#include <stdlib.h>
void test(int* ptr) {
    do {
        int x = *ptr; // ERR
    } while (ptr != NULL);
}