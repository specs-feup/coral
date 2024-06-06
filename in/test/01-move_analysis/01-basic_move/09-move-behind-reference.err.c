#pragma coral_test expect MoveBehindReferenceError

#pragma coral move
struct A {
  int a;
};


int test(struct A a, struct A a2) {
  struct A *ref1 = &a;
  struct A c = *ref1;
  return 0;
}
