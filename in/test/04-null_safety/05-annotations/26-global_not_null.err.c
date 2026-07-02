
#pragma coral_test expect PotentialNullDereferenceError

int* global_ptr = 0; 


#pragma coral null global global_ptr : null
void test_global() {
    int x = *global_ptr; // ERR
}