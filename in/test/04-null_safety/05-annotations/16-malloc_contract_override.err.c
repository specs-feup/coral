#pragma coral_test expect PotentialNullDereferenceError
#include <stdlib.h>
#pragma coral null p : not-null -> maybe-null
void safe_alloc(int *p) {
    p = malloc(sizeof(int));
    int a = *p;// Err
}