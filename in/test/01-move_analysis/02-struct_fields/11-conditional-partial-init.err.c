#pragma coral_test expect UseBeforeInitError

#pragma coral move
struct B
{
  int b;
};

#pragma coral move
struct A {
  struct B a;
  struct B b;
};

int test() {
  struct A a;
  if (1) {
    a.a.b = 1;
  } else {
    a.b.b = 2;
  }
  a;

  return 0;
}