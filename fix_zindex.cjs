const fs = require('fs');
const path = 'c:\\Users\\USER\\Desktop\\AISA_08\\Aisa_beta\\src\\pages\\Chat.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Move Welcome Screen to a higher z-index so it's clickable above the chat container
content = content.replace(/className="absolute inset-0 z-10 pointer-events-auto/, 'className="absolute inset-0 z-[100] pointer-events-auto');

// 2. Also ensure FuturisticToolCards onToolSelect is called correctly
// I'll make the click direct if needed, but let's first fix the z-index.

fs.writeFileSync(path, content, 'utf8');
console.log('Done');
