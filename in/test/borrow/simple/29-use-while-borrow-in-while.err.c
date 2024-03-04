#pragma coral_test expect UseWhileMutBorrowedError
// TODO Adding a use of a in line 7 makes the error message crash because $next_use is not expecting a condition

int main() {
    int a = 1;
    int *restrict ref1 = &a;
    
    while (*ref1 < 10 && a < 20) {
        *ref1 += 1;
    }

    return 0;
}
