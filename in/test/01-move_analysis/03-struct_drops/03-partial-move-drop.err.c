#pragma coral_test expect DropInconsistentStructError

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

int test(struct A a, struct A a2) {
  struct B x = a.a;
  struct B y = a.b;

  return 0;
}