#pragma coral_test expect UseWhileMutBorrowedError

#pragma coral lf arg1 = %a
#pragma coral lf arg2 = %a
#pragma coral lf return = %a
int *restrict callee(int *restrict arg1, int *restrict arg2) {
  return arg2;
}

int my_function(int a, int b) {
  return *callee(&a, &a) = a + b, a > 5 ? a : a * a;
}
