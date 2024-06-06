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

  a.a.b = 5;
  a.b.b = 6;

  return 0;
}