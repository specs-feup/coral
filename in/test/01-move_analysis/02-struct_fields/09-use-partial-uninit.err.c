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
  a.a.b = 1;
  a;
  a.b.b = 2;

  return 0;
}