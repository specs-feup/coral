#include <stdlib.h>
#pragma coral_test expect PotentialNullDereferenceError
#pragma coral not-null a
#pragma coral not-null b
void dual_input(int* a, int* b);

void test(int* x, int* y) {
    if (x != NULL) {
        dual_input(x, y); // ERR
    }
}