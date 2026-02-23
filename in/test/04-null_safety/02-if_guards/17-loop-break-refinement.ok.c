#include <stdlib.h>
void test(int* ptr) {
    while (1) {
        if (ptr != NULL) break;
        return; 
    }
    int x = *ptr; // OK
}