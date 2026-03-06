#pragma coral_test expect NullDereferenceError
#pragma coral not-null return
int* get_data() {
    return 0; // ERR
}