#pragma coral_test expect PreconditionViolationError
#include <stdlib.h>
#pragma coral null p :  not-null -> not-null
void consume(int* p);

void test() {
    int* ptr = malloc(sizeof(int));
    consume(ptr); // ERR
}