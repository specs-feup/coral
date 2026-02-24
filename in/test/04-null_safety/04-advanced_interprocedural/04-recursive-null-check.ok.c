#include <stdlib.h>

struct Node {
    int value;
    struct Node* next;
};

void print_list(struct Node* n) {
    if (n == 0) return;

    // OK
    int v = n->value;
    print_list(n->next);
}

int main() {
    return 0;
}