// https://doc.rust-lang.org/stable/error_codes/E0382.html
// assign to part of moved value: `a`

typedef struct {
    int a;
    int b;
} T;

int main() {
    T a = {1, 2};
    T b = a;

    a.a = 2;

    return 0;
}
