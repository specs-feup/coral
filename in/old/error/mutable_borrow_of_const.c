// https://doc.rust-lang.org/stable/error_codes/E0596.html
// cannot borrow `a` as mutable, as it is not declared as mutable

typedef struct {
    int a;
    int b;
} T;

int main() {
    const T a = {1, 2};
    T* restrict b = &a;
    
    return 0;
}
