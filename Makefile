.PHONY: gui all

CLAVA_PATH = clava/
CLAVA_JAR = Clava.jar


all:
	cd ${CLAVA_PATH} && java -jar ${CLAVA_JAR} -c ../clava_config.xml


gui:
	java -jar ${CLAVA_PATH}${CLAVA_JAR}
