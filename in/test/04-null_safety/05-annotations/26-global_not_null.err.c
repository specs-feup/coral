#pragma coral not-null global_ptr
int* global_ptr = 0; 

#pragma coral_test expect NullDereferenceError
void test_global() {
    int x = *global_ptr; // ERR
}