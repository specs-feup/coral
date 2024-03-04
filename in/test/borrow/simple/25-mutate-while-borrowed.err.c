#pragma coral_test expect MutateWhileBorrowedError

int main() {
    int a = 1;
    const int *ref1 = &a;
    
    a = 2;

    int b = *ref1;

    return 0;
}
