#include <stdlib.h>
int* global_ptr;

void opaque_function();

void test() {
    if (global_ptr != NULL) {
        opaque_function(); 
        int x = *global_ptr; // ERR
                        
    }
}