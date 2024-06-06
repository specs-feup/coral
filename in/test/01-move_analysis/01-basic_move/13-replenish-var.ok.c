#pragma coral move
struct A {
  int a;
};

struct A getA();

int test(struct A a, struct A a2) {
  while (a2.a) {
    a;
    a = getA();
  }
  return 0;
}