#pragma coral_test expect PotentialNullDereferenceError

int * some_global;
#pragma coral ensures return: not-null
int * get_safe_ptr(){
    return some_global;
};

void test(int cond) {
    int *ptr;
    if (cond) {
        ptr = get_safe_ptr();
    }
    // ERR
    int x = *ptr; 
}