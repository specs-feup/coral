#pragma coral_test expect InvalidDropFunctionError


#pragma coral drop bad
struct A {
  int b;
};

void bad(int wrong);

int test() {
  struct A a;

  return 0;
}