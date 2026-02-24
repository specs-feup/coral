void test() {
    int* a = malloc(sizeof(int));
    int* b = malloc(sizeof(int));

    if (a == 0 || b == 0) {
        if (a) free(a);
        if (b) free(b);
        return;
    }

    // OK
    *a = *b = 10;
}