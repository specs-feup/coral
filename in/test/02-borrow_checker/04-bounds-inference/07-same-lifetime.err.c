#pragma coral_test expect MutateWhileBorrowedError

const int *my_function(const int *a, const int *b) {
  a = b;
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
