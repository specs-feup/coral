#pragma coral lf a = %a
#pragma coral lf b = %b
#pragma coral lf result = %c
int add(const int *a, const int *b, int *restrict result) {
    *result = *a + *b;
    return 0;
}

#pragma coral lf a = %a
#pragma coral lf b = %b
#pragma coral lf result = %c
int subtract(const int *a, const int *b, int *restrict result) {
    *result = *a - *b;
    return 0;
}

#pragma coral lf a = %a
#pragma coral lf b = %b
#pragma coral lf result = %c
int multiply(const int *a, const int *b, int *restrict result) {
    *result = *a * *b;
    return 0;
}

#pragma coral lf a = %a
#pragma coral lf b = %b
#pragma coral lf result = %c
int divide(const int *a, const int *b, int *restrict result) {
    if (*b == 0) {
        return 1;
    }
    *result = *a / *b;
    return 0;
}
