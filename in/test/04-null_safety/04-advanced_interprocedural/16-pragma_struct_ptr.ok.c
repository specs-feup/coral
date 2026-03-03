struct Node {
    int val;
    struct Node *next;
};


void process_list(struct Node *n) {
    #pragma coral not-null n
    #pragma coral not-null n->next 
    
    n->val = 1;       // OK
    n->next->val = 2; // OK
}