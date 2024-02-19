int main() {
    int a = 1;
    
    int *restrict ref;
    ref = &a;
    *ref = 2;

    return 0;
}
