void use(const int *a) {

}

int main() {
    int foo = 2;
    int bar = 4;
    const int *p;

    p = &foo;
    if (2 > 1) {
        use(p);
        p = &bar;
    }

    use(p);
    return 0;
}