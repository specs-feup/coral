#pragma coral lf %a
struct A {
  #pragma coral lf a = %a
  const int *a;
};

int test(struct A a) {
  a;
  a;

  return 0;
}