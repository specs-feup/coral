#pragma coral not-null p
void test_alias(int* p) {
    int* q = p; 
    *q = 100; // OK
}