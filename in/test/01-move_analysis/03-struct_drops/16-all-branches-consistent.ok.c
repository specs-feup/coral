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

int test() {
  struct A a;
  int cond = 1;
  if (cond)
  {
    a.a.b = 5;
    a.b.b = 6;
    if (cond) {
      a;
    }
  } else {

  }

  return 0;
}