#pragma coral_test expect PotentialNullDereferenceError
typedef void (*callback_t)(int* p);

#pragma coral not-null p
void my_callback(int* p) {
    *p = 10;
}

void engine(callback_t cb, int* data) {
    cb(data); // ERR
}