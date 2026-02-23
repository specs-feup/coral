#include <stdlib.h>
void test(int* ptr) {
    while (ptr != NULL) {
        int x = *ptr; // OK
        if (x > 10) {
            ptr = NULL; 
        }
    }
}