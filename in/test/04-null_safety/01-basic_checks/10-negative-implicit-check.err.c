#pragma coral_test expect PotentialNullDereferenceError

void test(int* ptr) {
    if (!ptr) {
        
    } else {
        
    }
    *ptr = 5; // ERR
}