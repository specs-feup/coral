#pragma coral move
struct A {
  int a;
};

struct A getA();

int test(struct A a, struct A a2) {
  a;
  if (a2.a) {
    a = a2;
  } else {
     if (a2.a) {
      a = a2;
     } else {
      a = a2;
     }
  }

  a;
  return 0;
}
