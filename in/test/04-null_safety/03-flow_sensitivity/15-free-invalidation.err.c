#pragma coral_test expect UseAfterFreeError

#include <stdlib.h>
void test() {
    int* p = malloc(sizeof(int));
    if (p != NULL) {
        free(p);
        *p = 10; // ERR
    }
}