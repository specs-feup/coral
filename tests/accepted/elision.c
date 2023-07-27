typedef struct
{
    int a;
    int b;
} T;


void no_args() {

}


void args_no_refs(T t, int i) {

}


// to be elided
void input_only_elided(T* restrict t) {

}


#pragma coral lft t %a
void input_only(T* restrict t) { }


// to be elided
T* restrict in_out_elided(T* restrict t) {
    return t;
}


#pragma coral lft t %a
#pragma coral lft %a
T* restrict in_out(T* restrict t) {
    return t;
}


#pragma coral lft t %a %a
T* restrict in_out_single_pragma(T* restrict t) {
    return t;
}


#pragma coral lft t1 %a
#pragma coral lft t2 %b
#pragma coral lft %a
T* restrict must_elide(T* restrict t1, T* restrict t2) {
    return t1;
}


#pragma coral lft t1 %a t2 %b %a
T* restrict must_elide_single_pragma(T* restrict t1, T* restrict t2) {
    return t1;
}


#pragma coral lft t1 %a
#pragma coral lft t2 %a
#pragma coral lft %a
T* restrict extra_args(T* restrict t1, int i, T* restrict t2) {
    return t2;
}


#pragma coral lft t1 %a t2 %a %a
T* restrict extra_args_single_pragma(T* restrict t1, int i, T* restrict t2) {
    return t2;
}


int main() {

}