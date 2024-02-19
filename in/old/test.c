void push(int *restrict s, int c) {
    s[1] = c;
}


int len(const int *s) {
    return 20;
}

int main() {
    int s[20];
    push(s, len(s));
}