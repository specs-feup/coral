#include <stdlib.h>
struct Data {
    int* val;
};

#pragma coral_test expect PotentialNullDereferenceError
#pragma coral null d{val : not-null -> not-null} : maybe-null -> maybe-null
void process_struct(struct Data d) {
    int x = *(d.val); // OK
    d.val = NULL;
    int y = *(d.val); // ERR
}