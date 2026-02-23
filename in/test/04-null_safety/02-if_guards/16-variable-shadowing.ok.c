#include <stdlib.h>
void test(int* ptr) {
    if (ptr == NULL) {
        int* ptr = get_safe_pointer(); 
        int x = *ptr; // OK
    }
}