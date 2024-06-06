#include "lib.h"

int main() {
    const int a = 5, b = 6, c = 7;
    int result = 0;

    if (add(&a, &b, &result)) {
        return 1;
    }

    return 0;
}
