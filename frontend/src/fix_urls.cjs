const fs = require('fs');
const path = require('path');
const searchDir = 'c:\\\\Users\\\\ELCOT\\\\Downloads\\\\sivaa\\\\ServiceAtYourHome\\\\MERN_Stack_App\\\\frontend\\\\src';

function fixBackslash(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;

    content = content.replace(/\\\${import\.meta\.env\.VITE_API_URL/g, '${import.meta.env.VITE_API_URL');

    if (content !== originalContent) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Fixed ${filePath}`);
    }
}

function traverseDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            traverseDir(fullPath);
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            fixBackslash(fullPath);
        }
    });
}

traverseDir(searchDir);
