#pragma coral_test expect PotentialNullDereferenceError

int* global_ptr = 0;

void opaque_function(); 

int main() {
    int x = 42;
    global_ptr = &x;

    if (global_ptr != 0) {
        opaque_function(); 
        int val = *global_ptr; 
    }

    return 0;
}