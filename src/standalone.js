"use strict";

const fs = require("fs")
const path = require("path")

const buildReadme = () => {

// List of all the files in the current directory
const files = fs.readdirSync(__dirname);

console.log("Files in the current directory:");
console.log(files);

// List of all the files in the parent directory
const parentFiles = fs.readdirSync(path.join(__dirname, ".."));

console.log("Files in the parent directory:");
console.log(parentFiles);

// Detect if setting file is present

}

module.exports = buildReadme()