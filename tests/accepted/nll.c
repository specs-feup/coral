void use(const int *a) {

}

int main() {
    int foo = 0;
    int bar = 0;
    int *p;

    p = &foo;
    if (2 > 1) {
        use(p);
        p = &bar;
    }

    use(p);
    return 0;
}