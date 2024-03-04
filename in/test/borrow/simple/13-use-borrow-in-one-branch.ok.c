int main() {
    int a = 1;
    int *restrict ref1 = &a;

    if (*ref1 > 50) {
        a = 5;
    } else {
        *ref1 *= 2;
    }

    return 0;
}
