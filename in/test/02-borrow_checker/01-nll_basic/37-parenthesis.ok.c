int main() {
    int a = 5;
    int *restrict ptr1, *restrict ptr2;

    ptr1 = &a;
    int b = *ptr1;
    *ptr1 = b + *(&b);

    ptr2 = &a;
    int c = *ptr2;
    

    return 0;
}
