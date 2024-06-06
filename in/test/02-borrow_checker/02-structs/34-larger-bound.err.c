#pragma coral_test expect UseWhileMutBorrowedError

#pragma coral lf %a
#pragma coral lf %b: %a
typedef struct A {
  #pragma coral lf a = %a
  int *restrict a;
  #pragma coral lf b = %b
  int *restrict b;
} A;

int main() {
  int x = 5, y = 6;
  A a;
  a.a = &x;
  a.b = &y;

  y = 7;
  int c = *a.a;
}
