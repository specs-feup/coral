#pragma coral_test expect UseWhileMovedError

#pragma coral move
struct A {
  int a;
};


int test(struct A a, struct A a2) {
  if (1) {
    a;
  }
  else
  {
  }
  a;
  return 0;
}
