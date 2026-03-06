#pragma coral_test expect NullDereferenceError
#pragma coral not-null final *out
void fail_to_init(int** out) {
    *out = 0; // ERR
}