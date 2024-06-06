#pragma coral_test expect UseWhileMovedError

#pragma coral move
struct B
{
  int b;
};

#pragma coral move
struct A {
  struct B a;
};

int test(struct A a, struct A a2) {
  struct B x = a.a;
  struct B y = a.a;

  return 0;
}