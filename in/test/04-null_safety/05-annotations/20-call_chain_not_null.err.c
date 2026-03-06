#pragma coral_test expect PotentialNullDereferenceError
#pragma coral not-null p
void callee(int* p);

#pragma coral maybe-null p
void caller(int* p) {
    callee(p); // ERR
}