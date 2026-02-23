int * some_global;
void test(int cond) {
    int *ptr;
    if (cond) {
        ptr = get_safe_ptr();
    } else {
        ptr = &some_global;
    }
    int x = *ptr; 
}