#pragma coral_test expect ContractViolationError
#pragma coral null p: not-null -> not-null
void process(int* p);

void test(int* ptr) {
    process(ptr); // ERR
}