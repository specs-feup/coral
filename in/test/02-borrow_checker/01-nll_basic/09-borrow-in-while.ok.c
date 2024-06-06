int main() {
    int a = 1;
    int *restrict ref1 = &a;
    
    while (*ref1 < 10) {
        *ref1 += 1;
    }

    return 0;
}
