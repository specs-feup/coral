#include <stdlib.h>
int * global_var;
#pragma coral ensures return : not-null
int* secure_alloc() {
    int* p = malloc(sizeof(int));
    if (!p) return global_var;
    return p;
}

void test() {
    int* ptr = secure_alloc();
    *ptr = 42; // OK
}