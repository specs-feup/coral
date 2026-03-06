#include <stdlib.h>
#pragma coral not-null return
int* safe_alloc() {
    int* p = malloc(sizeof(int));
    if (p == NULL) exit(1); 
    return p; // OK
}