#pragma coral_test expect PotentialNullDereferenceError
#pragma coral not-null p
void process(int* p);

void test(int* ptr) {
    process(ptr); // ERR
}