#pragma coral safe
void multi_contract(int *a, int *b, int *c) {
    #pragma coral not-null a
    #pragma coral null b
    
    *a = 1;      // OK
    if (c != 0) *c = 3; // OK
    *b = 2;      // ERR
}