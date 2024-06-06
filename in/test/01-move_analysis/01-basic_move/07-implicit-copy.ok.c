struct A {
  int a;
  int b;
};


int test(struct A a, struct A a2) {
  struct A b = a;
  struct A c = a;
  return 0;
}
