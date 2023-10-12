.PHONY: all test gui

CLAVA_JAR = clava-build/ClavaWeaver.jar


all: double-indirection-error

classic:
	java -jar ${CLAVA_JAR} -c clava_config.xml

gui:
	java -jar ${CLAVA_JAR}


nll:
	npx clava-js src/main.mjs -- clang tests/accepted/nll.c

nll-error:
	npx clava-js src/main.mjs -- clang tests/error/prototype/nll_used_while_borrowed.c


reborrow:
	npx clava-js src/main.mjs -- clang tests/accepted/reborrow.c

double-indirection:
	npx clava-js src/main.mjs -- clang tests/accepted/reborrow_double_indirection.c

double-indirection-error:
	npx clava-js src/main.mjs -- clang tests/error/prototype/reborrow_double_indirection.c




# export DEBUG="*"
debug:
	npx clava-js src/main.mjs -w coral -- clang tests/error/prototype/nll_used_while_borrowed.c
