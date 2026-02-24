#pragma coral_test expect PotentialNullDereferenceError

#include <stdlib.h>
void update_static(int** p) {
    static int* internal_ptr = NULL;
    if (*p != NULL) {
        internal_ptr = *p;
    }
    int x = *internal_ptr; 
}