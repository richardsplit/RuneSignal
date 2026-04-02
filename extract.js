const fs = require('fs');
const xml = fs.readFileSync('c:/Users/Richard.Georgiev/OneDrive - DIGITALL Nature/Documents/TrustLayer/doc.xml', 'utf8');
const startTag = 'FILE: .env.local.example';
const endTag = 'VERIFY';

const startIndex = xml.indexOf(startTag);
if (startIndex === -1) {
    console.log('Start tag not found');
    process.exit(1);
}

const contentStart = xml.indexOf('<w:t', startIndex);
const endIndex = xml.indexOf(endTag, contentStart);

let result = '';
let currentPos = contentStart;

while (currentPos < endIndex && currentPos !== -1) {
    const tStart = xml.indexOf('<w:t', currentPos);
    if (tStart === -1 || tStart > endIndex) break;
    const valStart = xml.indexOf('>', tStart) + 1;
    const valEnd = xml.indexOf('</w:t>', valStart);
    let text = xml.substring(valStart, valEnd);
    // Handle space preservation
    if (text.includes('xml:space="preserve"')) {
        // text is already just the value if we did substring correctly
    }
    result += text + '\n';
    currentPos = valEnd;
}

console.log('---EXTRACTED---');
console.log(result);
console.log('---END---');
