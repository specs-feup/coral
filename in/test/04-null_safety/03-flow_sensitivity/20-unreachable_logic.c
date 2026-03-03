#pragma coral_test expect DeadCodeWarning 

#include <stdlib.h>

#pragma coral safe
void test(int *p) {
    if (p == NULL) {
    
        if (p != NULL) {
            *p = 10; 
        }
    }
}