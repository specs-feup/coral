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


#pragma coral_lf t %a
void input_only(T* restrict t) { }


// to be elided
T* restrict in_out_elided(T* restrict t) {
    return t;
}


#pragma coral_lf t %a
#pragma coral_lf %a
T* restrict in_out(T* restrict t) {
    return t;
}


#pragma coral_lf t1 %a
#pragma coral_lf t2 %b
#pragma coral_lf %a
T* restrict complete_fn(T* restrict t1, T* restrict t2) {
    return t1;
}


#pragma coral_lf t1 %a
#pragma coral_lf t2 %a
#pragma coral_lf %a
T* restrict extra_args(T* restrict t1, int i, T* restrict t2) {
    return t2;
}


int main() {

}