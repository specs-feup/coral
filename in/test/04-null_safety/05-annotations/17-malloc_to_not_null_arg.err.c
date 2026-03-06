#pragma coral_test expect PotentialNullDereferenceError
#pragma coral not-null p
void consume(int* p);

void test() {
    int* ptr = malloc(sizeof(int));
    consume(ptr); // ERR
}