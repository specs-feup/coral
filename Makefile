.PHONY: all test gui

CLAVA_PATH = clava-tool/
CLAVA_JAR = Clava.jar


all:
	cd ${CLAVA_PATH} && java -jar ${CLAVA_JAR} -c ../clava_config.xml

test:
	cd ${CLAVA_PATH} && java -jar ${CLAVA_JAR} -c ../clava_test_config.xml

gui:
	java -jar ${CLAVA_PATH}${CLAVA_JAR}
