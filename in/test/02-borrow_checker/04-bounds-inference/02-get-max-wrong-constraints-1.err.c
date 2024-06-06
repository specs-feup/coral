#pragma coral_test expect MutateWhileBorrowedError

const int *get_max(const int *val1, const int *val2) {
  if (*val1 > *val2) {
    return val1;
  } else {
    return val2;
  }
}

int main() {
  int a = 5, b = 6;
  const int *max = get_max(&a, &b);
  a = 6;
  return *max;
}