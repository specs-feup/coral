#pragma coral_test expect UseWhileMutBorrowedError

int *restrict recursion(int *restrict arg1) {
  if (*arg1 > 0) {
    *arg1 = *arg1 - 1;
    return recursion(arg1);
  }
  return arg1;
}

int main() {
  int a = 5;
  int *restrict ref1 = recursion(&a);
  a = 6;
  ref1;

  return 0;
}
