int main() {
    int a = 1;
    int b;
    
    int const *ref1 = &a;
    
    for (int i = 0; i < 10; i++) {
        b = *ref1;
        if (b == 5) {
            break;
        }  else {
            int const *ref2 = ref1;
            b = *ref2;
        }
    }
    
    int *restrict ref3 = &a;
    while (*ref3 < 10) {
        *ref3 += 1;
    }

    return 0;
}
