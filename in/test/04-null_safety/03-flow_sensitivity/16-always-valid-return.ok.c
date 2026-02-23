int* secure_alloc() {
    int* p = malloc(sizeof(int));
    if (!p) exit(1);
    return p;
}

void test() {
    int* ptr = secure_alloc();
    *ptr = 42; // OK
}