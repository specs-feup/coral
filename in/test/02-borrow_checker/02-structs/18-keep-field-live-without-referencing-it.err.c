#pragma coral_test expect UseWhileMutBorrowedError

#pragma coral lf %a
struct A {
  #pragma coral lf a = %a
  int *restrict a;
};

int main() {
  int b = 5;
  struct A a;
  a.a = &b;
  b = 6;
  struct A a2 = a;
}