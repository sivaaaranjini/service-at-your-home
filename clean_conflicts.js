const fs = require('fs');
const path = 'c:\\Users\\ELCOT\\Desktop\\sivaa\\ServiceAtYourHome\\MERN_Stack_App\\frontend\\src\\pages\\Dashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

let lines = content.split(/\r?\n/);
let newLines = [];
let skipping = false;

for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (line.startsWith('<<<<<<< HEAD')) {
        continue;
    }
    if (line.startsWith('=======')) {
        skipping = true;
        continue;
    }
    if (line.startsWith('>>>>>>>')) {
        skipping = false;
        continue;
    }
    if (!skipping) {
        newLines.push(line);
    }
}

fs.writeFileSync(path, newLines.join('\n'));
console.log('Cleaned up conflict markers!');
