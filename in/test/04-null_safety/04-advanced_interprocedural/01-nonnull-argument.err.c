#pragma coral_test expect NullDereferenceError

#include <stdio.h>

void process_data(int* ptr) {
    printf("%d\n", *ptr);
}

int main() {
    int* p = 0; 
    process_data(p); 
    
    return 0;
}