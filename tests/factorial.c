//void noImpl();

int factorial(int n) {
    if (n <= 1) return 1;
    return n * factorial(n - 1);
}

double foo() {
    double a = 0.0;
	int b = 0;
	unsigned int c = 0;
    
    //noImpl();

    switch (b) {
    	case 0:
    		break;
    	default:
    		break;
    }

    for(int i=0; i<1000; i++) {
		b += i;
		c += i;
    }
    
    return a;
}

int main() {
    
    int c = factorial(20);
    int f = factorial(20);
    int g = factorial(20);
    


    foo();

}
