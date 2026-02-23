#include <stdlib.h>
void test(int** ptr) {
    if (ptr != NULL) {
        int* inner = *ptr; 
        int val = *inner; // ERR
    }
}