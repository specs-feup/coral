int main() {
    int a = 1;
    
    if (a > 50) {
        int *restrict ref1 = &a;
        *ref1 = 5;
    }

    return 0;
}
