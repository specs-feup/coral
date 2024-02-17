void use(const int *a) {

}

int main() {
    int foo = 1;
    int bar = 2;
    const int *p;

    p = &foo;
    if (2 > 1) {
        use(p);
        foo = 4;
        // Other processing
        p = &bar;
        // More processing
    }
    foo = 8;
    use(p);
    return 0;
}