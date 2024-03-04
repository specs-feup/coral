#pragma coral_test expect UseWhileMutBorrowedError
// TODO This test has a bug while printing the error line because $invalid_use is inline

int main() {
    int a = 1;
    int b;
    
    int *restrict ref1 = &a, *restrict ref2 = &a;
    int *restrict ref3 = &a;
    b = *ref2;
    int *restrict ref4 = &a;
    
    b = *ref4;
    b = *ref3;
    b = 5;
    b = *ref1;

    return 0;
}
