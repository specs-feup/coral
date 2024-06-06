#pragma coral_test expect UseWhileMutBorrowedError

#pragma coral lf a = %a
int my_function(int *restrict a) {
    return 0;
}

int main() {
  int a = 5;
  int *restrict mutref = &a;
  my_function(&a);
  mutref;
  return 0;
}
