#pragma coral lf a = %a
#pragma coral lf b = %b
#pragma coral lf result = %c
int add(const int *a, const int *b, int *restrict result);

#pragma coral lf a = %a
#pragma coral lf b = %b
#pragma coral lf result = %c
int subtract(const int *a, const int *b, int *restrict result);

#pragma coral lf a = %a
#pragma coral lf b = %b
#pragma coral lf result = %c
int multiply(const int *a, const int *b, int *restrict result);

#pragma coral lf a = %a
#pragma coral lf b = %b
#pragma coral lf result = %c
int divide(const int *a, const int *b, int *restrict result);
