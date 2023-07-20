// https://doc.rust-lang.org/stable/error_codes/E0382.html
// borrow of moved value: `a`

typedef struct {
    int a;
    int b;
} T;

void foo(T* restrict a) {
    // do nothing
}

int main() {
    const T a = {1, 2};
    const T b = a;
    
    foo(&a);

    return 0;
}
