#pragma coral move
struct A {
  int a;
};

int test(struct A a, struct A a2) {
  int x = a.a;
  int y = a.a;

  return 0;
}
