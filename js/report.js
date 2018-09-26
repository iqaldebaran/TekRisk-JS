const pdfshift = require('pdfshift')('0a1075412bce47d38990b4d6b211ac0a');
const fs = require('fs');

let data = fs.readFileSync('ejemploreporte.html', 'utf8');

pdfshift.convert(data).then(function (binary_file) {
    fs.writeFile('result.pdf', binary_file, "binary", function () {})
}).catch(function({message, code, response, errors = null}) {})