#pragma coral_test expect NullDereferenceError
void test() {
    int* ptr; 
    int val = *ptr; 
}