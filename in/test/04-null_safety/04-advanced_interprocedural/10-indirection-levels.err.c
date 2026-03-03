#pragma coral_test expect PotentialNullDereferenceError
#pragma coral safe
void handle_double_ptr(int **ptr) {
    #pragma coral not-null ptr    
    int *internal = *ptr; // OK
    int val = *internal;  // ERR
}