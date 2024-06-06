#pragma coral lf arg1 = %a
#pragma coral lf return = %a
int *restrict callee1(int *restrict arg1) {
  return arg1;
}

#pragma coral lf arg1 = %a
#pragma coral lf return = %a
int *restrict callee2(int *restrict arg1) {
  return callee1(arg1);
}

int my_function(int a, int b) {
  return *callee1(callee2(&a)) + *callee2(callee1(&a));
}
