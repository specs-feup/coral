#pragma coral_test expect PreconditionViolationError
#include <stdlib.h>
#pragma coral null p : not-null -> maybe-null
void process(int* p);


void test() {
    process(NULL); // ERR
}