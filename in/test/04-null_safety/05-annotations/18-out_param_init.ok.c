#pragma coral not-null final *out
void get_ptr(int** out) {
    static int global_val = 42;
    *out = &global_val; 
    // Ok
}