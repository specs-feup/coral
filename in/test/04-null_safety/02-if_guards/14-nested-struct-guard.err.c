#include <stdlib.h>
struct Inner { int val; };
struct Outer { struct Inner* inner; };
void test(struct Outer* out) {
    if (out != NULL) {
        int x = out->inner->val; // ERR
    }
}