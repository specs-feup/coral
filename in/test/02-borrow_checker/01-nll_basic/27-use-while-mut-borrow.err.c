#pragma coral_test expect UseWhileMutBorrowedError

int main() {
    int a = 1;
    int *restrict ref1 = &a;
    
    int b = a;

    int c = *ref1;

    return 0;
}
