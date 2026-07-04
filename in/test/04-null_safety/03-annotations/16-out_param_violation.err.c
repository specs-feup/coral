#pragma coral_test expect ContractViolationError
#include <stdlib.h>
#pragma coral null out {*out : not-null -> not-null}: not-null -> not-null
void fail_to_init(int** out) {
    *out = NULL; // ERR
}