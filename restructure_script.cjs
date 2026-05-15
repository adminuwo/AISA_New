const fs = require('fs');
const file = 'src/Tools/AI_Social_Media/AiSocialMediaDashboard.jsx';
let content = fs.readFileSync(file, 'utf8');

// The markers to find
const card1StartStr = '{/* CARD 1: CORE IDENTITY */}';
const card2StartStr = '{/* CARD 2: VOICE & PERSONALITY */}';
const card3StartStr = '{/* ROW 2: VISUAL IDENTITY (FULL WIDTH) */}';
const card3EndStr = '            {/* AI SYSTEM INSIGHT */}';

const card2StartIdx = content.indexOf(card2StartStr);
const card3StartIdx = content.indexOf(card3StartStr);
const card3EndIdx = content.indexOf(card3EndStr);

if (card2StartIdx === -1 || card3StartIdx === -1 || card3EndIdx === -1) {
  console.log('Markers not found');
  process.exit(1);
}

// Extract Card 3
const card3Content = content.substring(card3StartIdx, card3EndIdx);

// Remove Card 3 from its original place
content = content.substring(0, card3StartIdx) + content.substring(card3EndIdx);

// Replace grid container
const gridContainerStart = '{/* ROW 1: CORE & VOICE */}\n            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">';
const newGridContainer = '{/* 2-COLUMN MASONRY LAYOUT */}\n            <div className="flex flex-col md:flex-row gap-4 items-start w-full">\n              {/* LEFT COLUMN: Core Identity + Visual Artifacts */}\n              <div className="flex flex-col gap-4 w-full md:w-1/2">';
content = content.replace(gridContainerStart, newGridContainer);

// Before Card 2, close Left Column and start Right Column, and insert Card 3 into the Left Column!
// Also fix Card 3 grid to be 1 column inside the half-width layout
let modifiedCard3Content = card3Content.trim();
modifiedCard3Content = modifiedCard3Content.replace(
  '<div className="grid grid-cols-1 md:grid-cols-2 gap-4">',
  '<div className="grid grid-cols-1 gap-4">'
);
modifiedCard3Content = modifiedCard3Content.replace(
  'className="w-full aspect-[3/1] md:h-24',
  'className="w-full h-24'
);

const card2InjectStr = '              ' + modifiedCard3Content + '\n              </div>\n\n              {/* RIGHT COLUMN: Vocal Signature */}\n              <div className="flex flex-col gap-4 w-full md:w-1/2">\n              ' + card2StartStr;

content = content.replace('              ' + card2StartStr, card2InjectStr);

// Close Right Column
content = content.replace(
  '            </div>\n\n            {/* AI SYSTEM INSIGHT */}',
  '              </div>\n            </div>\n\n            {/* AI SYSTEM INSIGHT */}'
);

fs.writeFileSync(file, content);
console.log('Layout updated successfully.');
