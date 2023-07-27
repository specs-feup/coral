int main() {
    int foo = 0;
    int bar = 0;
    int *restrict p;

    p = &foo;
    if (2 > 1) {
        *p = 2;
        *p = *p;
        p = &bar;
    }

    *p = 4;
}