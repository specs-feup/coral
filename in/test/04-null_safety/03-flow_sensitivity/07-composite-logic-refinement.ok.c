#include <stdlib.h>
void test(int *ptr, int is_ready) {
    if (ptr != NULL && is_ready) {
        
        *ptr = 1;
    }
}