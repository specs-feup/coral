#pragma coral_test expect MissingLifetimeBoundError

#pragma coral lf a = %a1
#pragma coral lf *a = %a2
#pragma coral lf b = %b1
#pragma coral lf *b = %b2
int my_function(int *restrict *restrict a, int *restrict *restrict b) {
  *b = *a;
  return 0;
}

int main() {
  int a = 5, b = 6;
  int *restrict refa = &a, *restrict refb = &b;
  int r = my_function(&refa, &refb);

  return 0;
}
