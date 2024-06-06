#pragma coral lf arg1 = %static
int callee(int *restrict arg1) {
  return *arg1;
}

#pragma coral lf arg1 = %static
int caller(int *restrict arg1) {
  return callee(arg1);
}
