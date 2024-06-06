int main() {
    int a = 1;
    int b = 2;
    int c = 3;
    int *restrict ref1;

    int i;
    for (i = 0; i < 10; i++) {
        if (i == 5)
            ref1 = &b;
        else if (i == 7)
            ref1 = &c;
        else if (i == 11)
            break;
        else
            ref1 = &a;

        *ref1 += 1;
    }

    return 0;
}
