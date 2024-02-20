typedef struct {
    int a;
    int b;
} T;

int main() {
    T a = {1, 2};
    
    const T *ref = &a;
    int n = ref->a;
    int m = (*ref).b;

    a.a = 2;

    return 0;
}
