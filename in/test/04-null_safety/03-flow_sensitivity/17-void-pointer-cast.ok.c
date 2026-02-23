#include <stdlib.h>
void test(int* ptr) {
    if (ptr == NULL) return;
    void* generic = ptr; 
    int* back = (int*)generic;
    *back = 10; // OK
}