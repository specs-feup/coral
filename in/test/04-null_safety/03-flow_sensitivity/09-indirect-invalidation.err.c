#pragma coral_test expect NullDereferenceError
#include <stdlib.h>
struct Box { int* data; };
void invalidate(struct Box* b) { b->data = NULL; }
void test() {
    struct Box myBox;
    myBox.data = malloc(sizeof(int));
    if (myBox.data != NULL) {
        invalidate(&myBox);
        *(myBox.data) = 5; // ERR
    }
}