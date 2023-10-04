.PHONY: all test gui

CLAVA_PATH = clava-build/
CLAVA_JAR = ClavaWeaver.jar


all:
	java -jar ${CLAVA_PATH}${CLAVA_JAR} -c clava_config.xml

test:
	java -jar ${CLAVA_PATH}${CLAVA_JAR} -c clava_test_config.xml

gui:
	java -jar ${CLAVA_PATH}${CLAVA_JAR}

js:
	DEBUG="*" npx clava-js src/main.mjs -- clang tests/error/prototype/nll_used_while_borrowed.c

jsw:
	DEBUG="*" npx clava-js src/main.mjs -w coral -- clang tests/error/prototype/nll_used_while_borrowed.c
