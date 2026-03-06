#include <stdlib.h>
#pragma coral not-null final p
#pragma coral_test expect NullDereferenceError
void ensure_init(int** p) {
    *p = NULL; // ERR
}