#pragma coral_test expect PotentialNullDereferenceError

#include <stdlib.h>

int* find_item(int id) {
    if (id > 100) return (int*) 0;
    return (int*) malloc(sizeof(int));
}

int main() {
    int* item = find_item(50);
    *item = 10; 

    return 0;
}