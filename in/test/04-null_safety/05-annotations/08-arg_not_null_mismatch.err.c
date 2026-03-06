#pragma coral not-null p
void process(int* p);

#pragma coral_test expect PotentialNullDereferenceError
void test(int* ptr) {
    process(ptr); // ERR
}