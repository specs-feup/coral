typedef struct A {
  int a;
} A;

typedef struct B {
  A b;
} B;

#pragma coral lf %a
typedef struct C {
  #pragma coral lf c = %a
  const B *c;
} C;

#pragma coral lf %a
typedef struct D {
  #pragma coral lf d.%a = %a
  C d;
} D;

int main() {
  B b;
  b.b.a = 5;
  const B *bref = &b;
  D d;
  d.d.c = &b;

  C c;
  c.c = bref;
  d.d = c;

  bref;
  d;
}
