#pragma coral_test expect MoveBehindBorrowError

#pragma coral move
struct NoCopy {
    int a;
};

int main() {
    struct NoCopy a;
    struct NoCopy *restrict ref1 = &a;
    *ref1;

    return 0;
}
