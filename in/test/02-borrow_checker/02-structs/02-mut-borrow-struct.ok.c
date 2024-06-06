typedef struct {
    int a;
    int b;
    int result;
} T;

int main() {
    T a;
    a.a = 1;
    a.b = 2;
    a.result = 0;

    T *restrict ref = &a;
    ref->result = ref->a + ref->b;

    a.a = a.result;
    a.b = a.result;

    return 0;
}
