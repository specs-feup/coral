#pragma coral_test expect MoveWhileBorrowedError

#pragma coral move
struct B
{
  int b;
};

void d(struct A *a);

#pragma coral drop d
struct A {
  struct B a;
  struct B b;
};

int test(struct A a) {
  const struct A *ref1 = &a;
  a;
  ref1;

  return 0;
}