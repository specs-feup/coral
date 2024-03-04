#pragma coral_test expect DroppedWhileBorrowedError

int main() {
    const int *ref1;
    {
        int a = 1;
        ref1 = &a;
    }
    int b = *ref1;

    return 0;
}
