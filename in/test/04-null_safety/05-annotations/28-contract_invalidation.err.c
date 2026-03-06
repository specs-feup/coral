#pragma coral maybe-null return
int* get_backup();

#pragma coral_test expect PotentialNullDereferenceError
#pragma coral not-null p
void test(int* p) {
    p = get_backup(); 
    int x = *p; // ERR
}