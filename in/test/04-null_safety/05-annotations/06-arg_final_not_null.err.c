#include <stdlib.h>
#pragma coral_test expect ContractViolationError
#pragma coral null p {*p: not-null -> not-null} : not-null -> not-null
void reset_ptr(int** p) {
    *p = NULL; // ERR
}