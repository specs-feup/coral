
#pragma coral null p : not-null -> not-null
void callee(int* p);

#pragma coral null p : not-null -> not-null
void caller(int* p) {
    callee(p); //ok
}