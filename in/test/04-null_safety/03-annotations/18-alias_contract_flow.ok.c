#pragma coral null p : not-null -> not-null
void test_alias(int* p) {
    int* q = p; 
    *q = 100; // OK
}