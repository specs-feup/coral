#pragma coral_test expect UseWhileMutBorrowedError

#pragma coral lf a = %a
#pragma coral lf b = %a
#pragma coral lf return = %a
int *restrict my_function(int *restrict a, int *restrict b) {
  return a;
}

int main() {
  int a = 5;
  int *restrict r = my_function(&a, &a);

  return 0;
}
