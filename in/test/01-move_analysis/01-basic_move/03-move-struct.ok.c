#pragma coral move
struct A {
  int a;
  int b;
};


int test(struct A a) {
  struct A b = a;
  return 0;
}