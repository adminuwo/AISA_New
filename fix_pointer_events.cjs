const fs = require('fs');
const path = 'c:\\Users\\USER\\Desktop\\AISA_08\\Aisa_beta\\src\\pages\\Chat.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Make the welcome screen wrapper pointer-events-none but its content pointer-events-auto
content = content.replace(/className="absolute inset-0 z-\[100\] pointer-events-auto/, 'className="absolute inset-0 z-[100] pointer-events-none');
content = content.replace(/className="relative z-10 flex flex-col items-center w-full max-w-7xl mx-auto px-4 sm:px-6 h-max mt-8 sm:mt-0"/, 'className="relative z-10 flex flex-col items-center w-full max-w-7xl mx-auto px-4 sm:px-6 h-max mt-8 sm:mt-0 pointer-events-auto"');

// 2. Also ensure the currentMode update in activateToolWithTypingEffect is followed by a state flush if possible
// (Recoil does this automatically, but let's make sure there are no other blocks)

fs.writeFileSync(path, content, 'utf8');
console.log('Done');
