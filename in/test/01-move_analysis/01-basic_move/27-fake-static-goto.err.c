#pragma coral_test expect DanglingReferenceError

void t(int const **res) {
    const int a = 5;
    *res = &a;
    loop:
    goto loop;
}
