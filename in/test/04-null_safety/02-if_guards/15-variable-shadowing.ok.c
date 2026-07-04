#include <stdlib.h>
#pragma coral null ensures return: not-null
int * get_safe_pointer(){
    int a = 5;
    int *b = &a;
    return b;
}
void test(int* ptr) {
    if (ptr == NULL) {
        int* ptr = get_safe_pointer(); 
        int x = *ptr; // OK
    }
}