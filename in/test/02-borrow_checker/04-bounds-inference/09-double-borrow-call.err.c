#pragma coral_test expect UseWhileMutBorrowedError

int *restrict my_function(int *restrict a, int *restrict b) {
  a = b;
  return a;
}

int main() {
  int a = 5;
  int *restrict r = my_function(&a, &a);

  return 0;
}
