
void process_array(int **arr, int size) {
    #pragma coral not-null arr  
    #pragma coral not-null *arr
    
    for(int i = 0; i < size; i++) {
        int val = *arr[i]; // OK
    }
}