void test(int cond) {
    int *ptr;
    if (cond) {
        ptr = get_safe_ptr();
    }
    // ERR
    int x = *ptr; 
}