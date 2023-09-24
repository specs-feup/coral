
typedef struct {
   int a;
   int b;
} T;

int main() {
   T t = {0, 0};
   #pragma lol
   T *p = &t;
   #pragma lol
   p->a = 1;
   #pragma lol
   (*p).a = 2;
}
