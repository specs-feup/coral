#pragma coral lf %a
typedef struct A {
  #pragma coral lf a = %a
  const int *a;
  #pragma coral lf b = %a
  int *restrict b;
} A;

int main() {
  int x = 5, y = 6;
  A a;
  a.a = &x;
  a.b = &y;

  *a.b = *a.a;
}
