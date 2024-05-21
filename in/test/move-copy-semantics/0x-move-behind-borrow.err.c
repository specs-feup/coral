#pragma coral_test expect MoveBehindBorrowError

#pragma coral move
struct C {
    int a;
};

int main() {
    struct C a;
    struct C *restrict ref1 = &a;
    *ref1;

    return 0;
}
