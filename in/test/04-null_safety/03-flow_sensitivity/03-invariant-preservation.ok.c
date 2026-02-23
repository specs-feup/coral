void test(int *ptr) {
    if (!ptr) return;
    for (int i = 0; i < 10; i++) {
        // OK
        *ptr = i; 
    }
}