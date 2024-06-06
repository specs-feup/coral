#pragma coral move
struct A {
  int a;
};

struct A getA();

int test(struct A a, struct A a2) {
  while (a2.a) {
    if (1) {
      a = getA();
    }
    else
    {
      break;
    }

    a;
  }
  return 0;
}