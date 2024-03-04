int main() {
    int a = 1;
    int *restrict ref1 = &a;
    const int *ref2 = ref1, *ref3 = ref1;
    
    int b = *ref2;
    int c = *ref3;
    *ref1 = 5;

    return 0;
}
