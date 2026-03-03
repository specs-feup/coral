#pragma coral_test expect NullDereferenceError

void test_error_handler(int *p) {
    #pragma coral null p
    *p = 10; // ERR
}