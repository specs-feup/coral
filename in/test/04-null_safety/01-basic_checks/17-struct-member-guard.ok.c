#include <stdlib.h>
struct Data { int value; };
void test(struct Data* d) {
    if (d != NULL) {
        d->value = 10; // OK
    }
}