#pragma coral_test expect MutableBorrowWhileBorrowedError

#include "lib.h"

int main() {
    const int a = 5, b = 6, c = 7;
    int result = 0;

    if (add(&a, &b, &result)) {
        return 1;
    }

    if (subtract(&result, &c, &result)) {
        return 1;
    }

    if (multiply(&result, &a, &result)) {
        return 1;
    }

    if (add(&result, &b, &result)) {
        return 1;
    }

    if (divide(&c, &result, &result)) {
        return 1;
    }

    return 0;
}