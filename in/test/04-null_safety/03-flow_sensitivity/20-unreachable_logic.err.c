// #pragma coral_test expect DeadCodeWarning 

#include <stdlib.h>


void test(int *p) {
    if (p == NULL) {
    
        if (p != NULL) {
            *p = 10; 
        }
    }
}