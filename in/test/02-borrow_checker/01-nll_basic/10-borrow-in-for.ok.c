int main() {
    int a = 1;
    int *restrict ref1 = &a;

    int i;
    for (i = 0; i < 10; i++) {
        *ref1 += 1;
    }

    return 0;
}
