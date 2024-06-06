
int my_function(int *restrict *restrict a, int *restrict *restrict b) {
  return 0;
}

int main() {
  int a = 5, b = 6;
  int *restrict refa = &a, *restrict refb = &b;
  int r = my_function(&refa, &refb);

  a = 7;
  b = 8;
  r;

  return 0;
}
