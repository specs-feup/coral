#pragma coral_test expect DanglingReferenceError

#pragma coral lf arg1 = %static
int callee(int *restrict arg1) {
  return *arg1;
}

int caller(int *restrict arg1) {
  return callee(arg1);
}

int test() {
  int a = 5;
  return callee(&a);
}