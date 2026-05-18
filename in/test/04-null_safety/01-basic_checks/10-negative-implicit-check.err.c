#pragma coral_test expect NullDereferenceError

void test(int* ptr) {
    if (!ptr) {
        
    } else {
        
    }
    *ptr = 5; // ERR
}