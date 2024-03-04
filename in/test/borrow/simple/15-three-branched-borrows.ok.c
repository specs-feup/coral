int main() {
    int a = 1;
    int *restrict ref1 = &a;

    if (*ref1 == 1) {
        a = 2;
    } else if (*ref1 == 2) {
        a = 3;
    } else {
        a = 4;
    }

    return 0;
}
