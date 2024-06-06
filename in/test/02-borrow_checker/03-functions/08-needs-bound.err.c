#pragma coral_test expect MissingLifetimeBoundError

#pragma coral lf a = %a
#pragma coral lf b = %b
#pragma coral lf return = %c
const int *my_function(const int *a, const int *b) {
  return a;
}

int main() {
  int a = 5;
  int b = 6;
  
  const int *r = my_function(&a, &b);
  b = 7;
  r;

  return 0;
}
