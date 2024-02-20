int main() {
    const int a = 5;
    const int *restrict ptr1, *restrict ptr2;

    ptr1 = &a;
    const int b = *ptr1;

    ptr2 = &a;
    const int c = *ptr2;

    return 0;
}
