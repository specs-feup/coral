#pragma coral copy
struct A {
  int a;
  int b;
};


int test(struct A a) {
  struct A b = a;
  struct A c = a;
  return 0;
}
