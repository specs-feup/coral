#pragma coral not-null p
void process(int* p);

void test(int* ptr) {
    if (ptr != 0) {
        process(ptr); // OK
    }
}