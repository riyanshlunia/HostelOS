const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
// Fix missing closing braces in template literals: ${expr` -> ${expr}`
code = code.replace(/\$\{([^}]*?)(?=\`)/g, '${$1}');

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed src/App.tsx');
