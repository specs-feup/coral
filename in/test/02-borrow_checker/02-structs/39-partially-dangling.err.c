#pragma coral_test expect DanglingReferenceError

#pragma coral drop d
#pragma coral lf %a
typedef struct A {
  #pragma coral lf a = %a
  const int *a;
  #pragma coral lf b = %a
  int *restrict b;
} A;

void d(struct A *a);

int main() {
  int x = 5;
  
  A a;
  {
  int y = 6;
  a.a = &x;
  a.b = &y;

  *a.b = *a.a;
  }
}
