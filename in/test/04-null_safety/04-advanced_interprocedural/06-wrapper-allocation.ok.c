#include <stdlib.h>


int* create_int(int val) {
    int* p = (int*) malloc(sizeof(int));
    if (p != 0) *p = val;
    return p;
}

int main() {
    int* my_ptr = create_int(10);
    if (my_ptr != 0) {
        // OK
        int res = *my_ptr;
    }
    
    return 0;
}