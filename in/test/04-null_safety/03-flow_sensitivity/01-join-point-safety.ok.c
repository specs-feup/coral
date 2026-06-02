#include <stdlib.h>
int * some_global;
#pragma coral ensures return: not-null
int * get_safe_ptr(){
    return some_global;
};

void test(int cond) {
    int *ptr;
    if (cond) {
        ptr = get_safe_ptr();
    } else {
        if(some_global != NULL)
            ptr = some_global;
        else 
            return;
    }
    int x = *ptr; 
}