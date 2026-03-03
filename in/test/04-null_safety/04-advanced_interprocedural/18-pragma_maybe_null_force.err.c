#pragma coral_test expect PotentialNullDereferenceError

#pragma coral safe
void test() {
    int x = 10;
    int *ptr = &x;
    
    #pragma coral maybe-null ptr 
    
    int val = *ptr; // ERR
}