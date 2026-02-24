#pragma coral_test expect UninitializedPointerError
void test() {
    int* ptr; 
    int val = *ptr; 
}