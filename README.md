# CORAL


## How to run

### Prerequisites
- Node (v18)
- npm
- Java (JDK 17)
- Gradle (7)
- Git

### Installation

1. Create a new folder with a package.json file

```json
{
  "name": "coralws",
  "type": "module",
  "workspaces": [
    "lara-framework/Lara-JS",
    "clava/Clava-JS",
    "lara-flow",
    "clava-flow",
    "coral"
  ]
}
```

2. Run
```sh
git clone https://github.com/specs-feup/specs-java-libs
git clone https://github.com/specs-feup/lara-framework.git
git clone https://github.com/specs-feup/clava.git
git clone https://github.com/specs-feup/lara-flow.git
git clone https://github.com/specs-feup/clava-flow.git
git clone https://github.com/specs-feup/coral.git
npm i
npm run build -w lara-framework/Lara-JS 
npm run build -w clava/Clava-JS
npm run build -w lara-flow
npm run build -w clava-flow
npm run build -w coral
npm i
gradle installDist -p clava/ClavaWeaver
node lara-framework/Lara-JS/scripts/copy-folder.js -i ./clava/ClavaWeaver/build/install -o ./clava/Clava-JS/java-binaries
```

### Execution

To execute the internal unit tests:

```sh
npm run test -w coral
```

To run a codebase in our sandbox, first put your codebase (for example a single `main.c` file) in `coral/in/sandbox` and then run:

```sh
npm run sandbox -w coral
```
