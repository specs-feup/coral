void test(int* a, int* b) {
    if (a || b) {
        int res = *a; // ERR
    }
}