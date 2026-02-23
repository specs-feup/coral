#include <stdlib.h>
void test(int* ptr) {
    for (; ptr != NULL; ptr = NULL) {
        int x = *ptr; // OK
    }
}