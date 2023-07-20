#include <stdio.h>

typedef struct {
    int a;
    int b;
} T;

int main() {
    T a = {1, 2};
    T b = a;

    a.a = 2;

    return 0;
}
