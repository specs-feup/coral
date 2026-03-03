int *global_ptr;
#pragma coral not-null global_ptr

void use_global() {
    *global_ptr = 100; // OK
}