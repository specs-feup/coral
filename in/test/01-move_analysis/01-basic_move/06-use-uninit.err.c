#pragma coral_test expect UseBeforeInitError
#pragma coral_test expect UseBeforeInitError

#pragma coral copy
struct A {
  int a;
  int b;
};


int test(struct A a, struct A a2) {
  struct A b;
  struct A c = b;
  return 0;
}
