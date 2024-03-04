int main() {
    int a = 1;
    const int *ref1 = &a;
    const int *const *ref2 = &ref1;

    int b = *ref1;
    int c = **ref2;
    int d = *ref1;

    return 0;
}
