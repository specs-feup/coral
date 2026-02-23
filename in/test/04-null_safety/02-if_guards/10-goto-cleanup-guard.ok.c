void test(int* ptr) {
    if (!ptr) goto cleanup;
    int x = *ptr; // OK
cleanup:
    return;
}