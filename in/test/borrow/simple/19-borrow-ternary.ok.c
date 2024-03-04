int main() {
    int a = 1, b = 2;
    int *restrict ref1 = 3 > 5? &a : &b;
 
    *ref1 = 5;

    return 0;
}
