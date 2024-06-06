#pragma coral lf arg1 = %a
#pragma coral lf return = %a
int *restrict recursion(int *restrict arg1) {
  if (*arg1 > 0) {
    *arg1 = *arg1 - 1;
    return recursion(arg1);
  }
  return arg1;
}
