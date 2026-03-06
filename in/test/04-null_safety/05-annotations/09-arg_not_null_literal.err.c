#include <stdlib.h>
#pragma coral not-null p
void process(int* p);

#pragma coral_test expect NullDereferenceError
void test() {
    process(NULL); // ERR
}