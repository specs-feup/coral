void process(int *p) {
    #pragma coral not-null p
    int val = *p; // OK
}