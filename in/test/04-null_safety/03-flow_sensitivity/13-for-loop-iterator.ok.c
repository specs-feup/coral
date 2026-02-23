#include <stdlib.h>
void test(int** list) {
    for (int** curr = list; *curr != NULL; curr++) {
        int value = **curr; 
    }
}