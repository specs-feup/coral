#pragma coral_test expect PreconditionViolationError

#pragma coral null p : not-null -> not-null
void process(int* p);


void test(int* ptr) {
    process(ptr); // ERR
}