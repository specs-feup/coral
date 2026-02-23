#include <stdlib.h>
struct Node { int val; struct Node* next; };
void walk(struct Node* head) {
    struct Node* curr = head;
    while (curr != NULL) {
        int v = curr->val; // OK: Protegido pela condição do while
        curr = curr->next;
    }
}