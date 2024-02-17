void use(const int *a) {

}

int main() {
    int a = 1;
    const int *p;
    if (2 > 4) {
        int b = 2;
        p = &b;
    }
    use(p);
}
