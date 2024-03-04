int main() {
    int a = 1;
    int *restrict ref1 = &a;

    switch (*ref1) {
        case 1:
            a = 2;
            break;
        case 2:
            a = 3;
            break;
        default:
            a = 4;
            break;
    }

    return 0;
}
