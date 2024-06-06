#pragma coral_test expect UseWhileMovedError

#pragma coral move
typedef struct B {
  int b;
} B;
struct A {
  int a;
  B b;
};


int test(struct A a, struct A a2) {
  struct A b = a;
  struct A c = a;
  return 0;
}
