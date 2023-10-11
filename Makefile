.PHONY: all test gui

CLAVA_JAR = clava-build/ClavaWeaver.jar


all:
	npx clava-js src/main.mjs -- clang tests/error/prototype/nll_used_while_borrowed.c

gui:
	java -jar ${CLAVA_JAR}

# export DEBUG="*"
debug:
	npx clava-js src/main.mjs -w coral -- clang tests/error/prototype/nll_used_while_borrowed.c
