#pragma coral_test expect UseWhileMutBorrowedError

struct MyStruct {
  int i;
};

int main() {
    struct MyStruct s1;
    s1.i = 5;
    struct MyStruct *restrict ref1;
    ref1 = &s1;
    struct MyStruct s2 = s1;
    const struct MyStruct *d = ref1;
}

