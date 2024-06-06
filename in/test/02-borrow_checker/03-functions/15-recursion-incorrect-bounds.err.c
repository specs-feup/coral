#pragma coral_test expect MissingLifetimeBoundError

#pragma coral lf arg1 = %a
#pragma coral lf return = %b
int *restrict recursion(int *restrict arg1) {
  if (*arg1 > 0) {
    *arg1 = *arg1 - 1;
    return recursion(arg1);
  }
  return arg1;
}
