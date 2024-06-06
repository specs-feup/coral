#pragma coral_test expect UseWhileMovedError

#pragma coral move
struct B
{
  int b;
};

#pragma coral move
struct A {
  struct B a;
  int b;
};

int test() {
  struct A a;
  a.a.b = 5;
  a.b = 6;

  a.a;
  a.b;
  a.a;

  return 0;
}