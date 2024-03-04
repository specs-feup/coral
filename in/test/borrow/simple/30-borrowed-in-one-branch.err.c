#pragma coral_test expect MutateWhileBorrowedError

int main() {
    int a = 1, b = 2;
    const int *ref;

    ref = &a;
    if (2 > 1) {
        int _ = *ref;
        a = 4;
        ref = &b;
    }

    a = 8;

    int _ = *ref;
    return 0;
}
