#include <stdlib.h>
#pragma coral_test expect NullDereferenceError
#pragma coral null p : not-null -> null
void test(int *p) {
    int a = *p;
    free(p);
    int b = *p;
}