int main() {
    int a = 1;
    
    const int *ref = &a;
    int b = *ref;

    return 0;
}
