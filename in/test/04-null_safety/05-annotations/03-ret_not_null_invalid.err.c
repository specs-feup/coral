#pragma coral_test expect NullDereferenceError
#pragma coral not-null return
int* get_data(int condition) {
    if (condition) {
        return 0; // ERR
    }
    int x = 10;
    return &x;
}