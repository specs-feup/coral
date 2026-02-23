#include <stdlib.h>
int test(int* ptr) {
    return (ptr != NULL) ? *ptr : 0; // OK
}