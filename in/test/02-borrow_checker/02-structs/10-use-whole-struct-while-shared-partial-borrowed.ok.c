struct MyStruct {
  int i1;
  int i2;
};

int main() {
    struct MyStruct s1;
    s1.i1 = 5;
    s1.i2 = 6;
    const int * ref1;
    ref1 = &s1.i1;
    struct MyStruct s2 = s1;
    const int *d = ref1;
}

