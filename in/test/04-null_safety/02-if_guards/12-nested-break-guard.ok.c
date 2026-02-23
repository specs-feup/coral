#include <stdlib.h>
void test(int* ptr) {
    if (ptr == NULL) return;
    while(1) {
        while(1) {
            break;
        }
        int x = *ptr; // OK
        break;
    }
}