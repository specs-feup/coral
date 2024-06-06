#pragma coral_test expect UseWhileMovedError

#pragma coral move
struct A {
  int a;
};


int test(struct A a, struct A a2) {
  while (a2.a) {
    a;
  }
  return 0;
}
