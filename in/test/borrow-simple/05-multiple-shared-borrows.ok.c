int main() {
    int a = 1;
    int b;
    
    int const *ref1 = &a, const *ref2 = &a;
    int const *ref3 = &a;
    b = *ref2;
    int const *ref4 = &a;
    
    b = *ref4;
    b = *ref3;
    b = 5;
    b = *ref1;

    return 0;
}
