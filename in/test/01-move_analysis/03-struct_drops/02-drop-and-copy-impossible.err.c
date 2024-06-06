#pragma coral_test expect StructCannotBeCopyError

#pragma coral drop d
#pragma coral copy
struct A {
  int a;
};

void d(struct A *a);

int test() {
  struct A a;
  a.a = 5;

  a;
  a;

  return 0;
}
