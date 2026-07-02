#pragma coral null p :  not-null -> not-null
void test_loop(int* p, int count) {
    for(int i = 0; i < count; i++) {
        *p += i; // OK
    }
}