void use(const int *a) {

}

int main() {
    int foo = 0;
    int bar = 0;
    const int *p;

    p = &foo;
    if (2 > 1) {
        use(p);
        // Other processing
        p = &bar;
        // More processing
    }

    use(p);
    return 0;
}