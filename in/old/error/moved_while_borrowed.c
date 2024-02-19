// https://doc.rust-lang.org/stable/error_codes/E0505.html
// cannot move out of `a` because it is borrowed
typedef struct {
    int a;
    int b;
} T;

void eat(T t) {
    // do nothing
}

void borrow(const T* t) {
    // do nothing
}

int main() {
    const T a = {1, 2};
    
    eat(a);
    borrow(&a);

    return 0;
}
