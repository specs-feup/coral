#include <stdio.h>

int main() {
    int a = 1;
    int *const p = &a;
    int *p1 = &a;
    int *p2 = &a;

    *p1 += 1;

    printf("%d %d\n", *p1, *p2);    
    
    return 0;
}
