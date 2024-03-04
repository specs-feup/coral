int main() {
    int a = 1;
    int *restrict ref1 = &a;
    a = *ref1;
    return 0;
}
