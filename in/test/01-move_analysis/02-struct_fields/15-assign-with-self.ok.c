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
  a.b = 6;
  a.a.b = a.b;

  return 0;
}