#pragma coral move
struct A {
  int a;
};

struct A getA();

int test(struct A a, struct A a2) {
  a = a2;

  return 0;
}