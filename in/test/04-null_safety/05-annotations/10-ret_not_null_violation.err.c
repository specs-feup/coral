#pragma coral not-null return
#pragma coral_test expect NullDereferenceError
int* get_instance() {
    return 0; // ERR
}