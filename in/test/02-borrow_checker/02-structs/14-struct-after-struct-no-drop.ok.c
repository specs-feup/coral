#pragma coral lf %a
struct A {
  #pragma coral lf a = %a
  int *restrict a;
};

int main() {
  struct A a;
  int b = 5;
  a.a = &b;
  struct A a2;
  a2.a = &b;
}