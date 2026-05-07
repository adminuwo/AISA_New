const fs = require('fs');
const lines = fs.readFileSync('c:/Users/USER/Desktop/AISA_06/Aisa_beta/src/pages/Chat.jsx', 'utf-8').split('\n');
const queries = ["navigate('/dashboard/chat/new'"];
queries.forEach(q => {
  console.log('--- ' + q + ' ---');
  lines.forEach((l, i) => {
    if(l.includes(q)) console.log((i + 1) + ': ' + l.trim());
  });
});
