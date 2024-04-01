#pragma coral_test expect MoveBehindBorrowError

struct NoCopy;

int main() {
    struct NoCopy a = NoCopy;
    struct NoCopy *restrict ref1 = &a;
    *ref1;

    return 0;
}
