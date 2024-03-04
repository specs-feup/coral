int main() {
    int a = 1, b = 2;
    const int *ref;

    ref = &a;
    if (2 > 1) {
        int _ = *ref;
        ref = &b;
    }

    int _ = *ref;
    return 0;
}
