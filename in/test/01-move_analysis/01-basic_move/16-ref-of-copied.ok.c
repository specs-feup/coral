#pragma coral copy
struct A {
  int a;
};

struct A getA();

int test(struct A a, struct A a2) {
  a;
  struct A *ref1 = &a;
  return 0;
}