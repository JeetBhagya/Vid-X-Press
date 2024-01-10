# Vid-X-Press
An industry-level backend-oriented project with a complex model.

## Project set-up
1) .gitkeep: to track an empty folder, or a folder with untracked files, create a 0kb file with the .gitkeep file extension in that folder.
2) .gitignore: to tell Git which files and directories to ignore when you make a commit.
3) There are two types of import in Javascript(Module-import and common JS-require)- I'm with Module-import
4) nodemon install: npm i -D nodemon
```
"scripts":{
    "div": "nodemon src/index.js"
},
```
5) prettier install : npm i -D prettier
```
.prettierrc

{
    "singleQuote": false,
    "bracketSpacing": true,
    "tabWidth": 4,
    "trailingComma": "es5",
    "semi": true
}
```
```
.prettierignore

/.vscode
/nodemodules
./dist

*.env
.env
.env*

```