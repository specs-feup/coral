#pragma coral_test expect ContractViolationError
#include <stdlib.h>
#pragma coral null p: not-null -> not-null
void ensure_init(int* p) {
    p = NULL; // ERR
}