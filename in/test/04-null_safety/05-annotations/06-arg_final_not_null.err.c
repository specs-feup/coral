#pragma coral_test expect NullDereferenceError
#pragma coral not-null final p
void reset_ptr(int** p) {
    *p = 0; // ERR
}