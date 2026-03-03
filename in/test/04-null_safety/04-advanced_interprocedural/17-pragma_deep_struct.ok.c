struct Inner { int *p; };
struct Outer { struct Inner *in; };

#pragma coral safe
void test(struct Outer *out) {
    #pragma coral not-null out
    #pragma coral not-null out->in
    #pragma coral not-null out->in->p
    
    int val = *(out->in->p); // OK
}