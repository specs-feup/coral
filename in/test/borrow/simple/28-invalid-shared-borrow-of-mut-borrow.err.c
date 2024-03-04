#pragma coral_test expect MutateWhileBorrowedError

int main() {
    int a = 1;
    int *restrict ref1 = &a;
    const int *ref2 = ref1;
    
    *ref1 = 5;
    int b = *ref2;

    return 0;
}
