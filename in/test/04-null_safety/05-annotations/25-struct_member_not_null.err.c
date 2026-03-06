#include <stdlib.h>
struct Data {
    int* val;
};

#pragma coral_test expect PotentialNullDereferenceError
#pragma coral not-null d.val
void process_struct(struct Data d) {
    int x = *(d.val); // OK
    d.val = NULL;
    int y = *(d.val); // ERR
}