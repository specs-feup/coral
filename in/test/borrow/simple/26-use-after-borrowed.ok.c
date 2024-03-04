int main() {
    int a = 1;
    int *restrict ref1 = &a;
    a = 2;

    return 0;
}
