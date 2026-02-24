#pragma coral_test expect NullDereferenceError

#include <stdlib.h>
void test() {
    int** arr = (int**) malloc(2 * sizeof(int*));
    if (arr != 0) {
        arr[0] = (int*) malloc(sizeof(int));
        arr[1] = 0; 

        if (arr[0] != 0) {
            int x = *arr[0]; // OK
            int y = *arr[1]; // ERR
        }
    }
}