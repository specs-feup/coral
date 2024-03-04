int main() {
    int a = 1;
    
    const int *ref;
    ref = (((&a)));
    int b = *ref;

    return 0;
}
