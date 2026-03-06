#pragma coral not-null p
void test_loop(int* p, int count) {
    for(int i = 0; i < count; i++) {
        *p += i; // OK
    }
}