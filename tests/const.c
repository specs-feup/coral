#include <stdio.h>

// typedef const int cint;
// #define CINT const int

int global;

int foo(const int f1, int f2) {
    return f1 > f2 ? 1 : 2;
}

int main() {
    int a;
    const int b = 3;

    a = 2;
    int c = foo(a, b);
    int d = c;

    d++;

    printf("%d %d\n", c, d);    
    
    return 0;
}
