#include <stdlib.h>

int get_data(int** ptr, int simulate_fail) {
    if (simulate_fail) {
        return -1;
    }
    *ptr = (int*) malloc(sizeof(int));
    if (*ptr == NULL) {
        return -1;
    }
    **ptr = 42; 
    return 0;
}

int main() {
    int* p = NULL;
    if (get_data(&p, 0) == 0) {
        int val = *p; // OK
    }
    return 0;
}