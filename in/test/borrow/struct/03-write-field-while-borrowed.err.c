#pragma coral_test expect MutateWhileBorrowedError

struct MyStruct {
  int i;
};

int main() {
    struct MyStruct s1;
    struct MyStruct *ref1;
    s1.i = 5;
    ref1 = &s1;
    s1.i = 6;
    int d = ref1->i;
}
