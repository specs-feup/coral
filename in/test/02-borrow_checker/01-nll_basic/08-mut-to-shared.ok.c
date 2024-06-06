int main() {
    float a = 5.0;
    const float *ptr1, *ptr2;

    float *restrict ptr3 = &a;

    ptr1 = ptr3;
    ptr2 = ptr3;
    
    const float b = *ptr1;
    const float c = *ptr2;

    *ptr3 += 6.0;

    return 0;
}
