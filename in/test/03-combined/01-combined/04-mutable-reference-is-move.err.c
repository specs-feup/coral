#pragma coral_test expect UseWhileMovedError

#pragma coral lf %a
struct A {
  #pragma coral lf a = %a
  int *restrict a;
};

int test(struct A a) {
  a;
  a;

  return 0;
}