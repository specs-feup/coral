#include <stdlib.h>
void test(int* input) {
    int* ptr = input;
    ptr = NULL;
    int val = *ptr; 
}