#include <stdlib.h>
void test(int* ptr, int* other) {
    if (ptr != NULL) {
        ptr = other; 
        int x = *ptr; // ERR
    }
}