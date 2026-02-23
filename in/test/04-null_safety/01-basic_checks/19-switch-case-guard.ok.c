#include <stdlib.h>
void test(int* ptr, int option) {
    if (ptr == NULL) return;
    switch(option) {
        case 1:
            *ptr = 1; // OK
            break;
    }
}