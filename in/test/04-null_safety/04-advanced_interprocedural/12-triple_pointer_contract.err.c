#pragma coral_test expect PotentialNullDereferenceError

#pragma coral safe
void test(int ***ppp) {
    #pragma coral not-null ppp
    #pragma coral not-null *ppp
    
    int **pp = *ppp;   // OK 
    int *p = *pp;      // OK 
    int val = *p;      // ERR
}