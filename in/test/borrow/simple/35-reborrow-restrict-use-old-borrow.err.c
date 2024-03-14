#pragma coral_test expect UseWhileMutBorrowedError

int main() {
	int a = 5;
	int *restrict ref1 = &a;
	int *restrict ref2 = ref1;

	*ref1 = 5;

	*ref2 = 10;
	*ref1 = 5;
	a = 0;

	return 0;
}
