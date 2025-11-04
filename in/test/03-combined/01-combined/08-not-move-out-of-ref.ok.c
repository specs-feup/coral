#pragma coral move
#pragma coral lf %a
struct A {
  #pragma coral lf a = %a
  const int *a;
};

#pragma coral lf a = %a
#pragma coral lf b = %b
#pragma coral lf a->%a = %b
#pragma coral lf return = %b
const int *test(struct A *restrict a, const int *b) {
  a->a = b;
  return a->a;
}