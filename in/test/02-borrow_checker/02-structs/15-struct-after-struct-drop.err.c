#pragma coral_test expect UseWhileMutBorrowedError

#pragma coral drop drop
#pragma coral lf %a
struct A {
  #pragma coral lf a = %a
  int *restrict a;
};

void drop(struct A *a);

int main() { 
  struct A a;
  int b = 5;
  a.a = &b;
  struct A a2;
  a2.a = &b;
}
