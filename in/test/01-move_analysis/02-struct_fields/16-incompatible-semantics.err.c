#pragma coral_test expect IncompatibleSemanticsPragmasError

#pragma coral move
#pragma coral copy
struct A {
  int b;
};

int test() {
  struct A a;

  return 0;
}