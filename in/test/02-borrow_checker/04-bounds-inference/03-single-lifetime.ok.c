int my_function(int *restrict a) {
    return 0;
}

int main() {
  int a = 5;
  my_function(&a);
  return 0;
}
