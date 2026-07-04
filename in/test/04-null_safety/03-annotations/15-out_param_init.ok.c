#pragma coral null out {*out : maybe-null -> not-null}: not-null -> not-null
void get_ptr(int** out) {
    int val = 42;
    *out = &val; 
    // Ok
}