#include <stdbool.h>
#include <stdlib.h>
void test(int* ptr) {
    bool is_safe = (ptr != NULL);
    if (is_safe) {
        int x = *ptr; // OK
    }
}