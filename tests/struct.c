/******************************************************************************

                            Online C Compiler.
                Code, Compile, Run and Debug C program online.
Write your code in this editor and press "Run" button to compile and execute it.

*******************************************************************************/


#include <stdio.h>
#include <stdlib.h>

struct Test {
    int a;
    char *s;
};

struct Test new() {
    struct test *t = calloc(1, sizeof(struct Test));

    return *t;
}


int main()
{
    struct Test t;
    


    char *c = (char*) calloc(16, sizeof(char));
    
    c[0] = 'a';
    c[1] = 'b';

    printf("%s", c);
    
    free(c);

    return 0;
}
