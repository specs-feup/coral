int main() {
    int a = 5;
    int *restrict ptr1, *restrict ptr2;

    ptr1 = &a;
    int b = *ptr1;
    *ptr1 = *ptr1 + 4;

    ptr2 = &a;
    *ptr2 *= 2;
    int c = *ptr2;
    

    return 0;
}
