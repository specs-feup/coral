int main() {
    const int a = 5;
    const int *ptr1, *ptr2;

    ptr1 = &a;
    ptr2 = &a;
    
    const int b = *ptr1;
    const int c = *ptr2;

    return 0;
}
