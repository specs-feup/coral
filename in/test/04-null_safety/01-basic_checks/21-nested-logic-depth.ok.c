#include <stdlib.h>
void test(int* a, int* b) {
    if (a != NULL) {
        if (b != NULL) {
            int res = *a + *b; // OK
        }
    }
}