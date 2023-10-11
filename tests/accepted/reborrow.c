void use(const int* param) { }

int main() {
    int foo = 2;
    int bar = 4;
    const int* x = &foo;
    const int* y = &*x;

    x = &bar;
    use(y);
}
