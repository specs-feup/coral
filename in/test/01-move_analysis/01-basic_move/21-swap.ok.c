#pragma coral move
struct A {
  int a;
};

struct A getA();

int test(struct A a, struct A a2) {
  struct A tmp = a;
  a = a2;
  a2 = tmp;

  return 0;
}