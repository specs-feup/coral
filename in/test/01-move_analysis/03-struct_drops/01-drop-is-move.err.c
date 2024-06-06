#pragma coral_test expect UseWhileMovedError

#pragma coral drop d
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