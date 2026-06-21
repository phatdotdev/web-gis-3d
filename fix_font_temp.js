const fs = require('fs');
const path = require('path');

const win1252ToByte = {
  0x20AC: 0x80, // €
  0x201A: 0x82, // ‚
  0x0192: 0x83, // ƒ
  0x201E: 0x84, // „
  0x2026: 0x85, // …
  0x2020: 0x86, // †
  0x2021: 0x87, // ‡
  0x02C6: 0x88, // ˆ
  0x2030: 0x89, // ‰
  0x0160: 0x8A, // Š
  0x2039: 0x8B, // ‹
  0x0152: 0x8C, // Œ
  0x017D: 0x8E, // Ž
  0x2018: 0x91, // ‘
  0x2019: 0x92, // ’
  0x201C: 0x93, // “
  0x201D: 0x94, // ”
  0x2022: 0x95, // •
  0x2013: 0x96, // –
  0x2014: 0x97, // —
  0x02DC: 0x98, // ˜
  0x2122: 0x99, // ™
  0x0161: 0x9A, // š
  0x203A: 0x9B, // ›
  0x0153: 0x9C, // œ
  0x017E: 0x9E, // ž
  0x0178: 0x9F, // Ÿ
  0x0111: 0x91  // đ -> 0x91
};

function customDecode(str) {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (win1252ToByte[c] !== undefined) {
      bytes.push(win1252ToByte[c]);
    } else if (c <= 0xFF) {
      bytes.push(c);
    } else {
      bytes.push(c & 0xFF);
    }
  }
  return Buffer.from(bytes).toString('utf8');
}

function isCorrupted(str) {
  return /Ã[\u0080-\u00FF\u201C\u201D\u2018\u2019\u2039\u203A\u0152\u0153\u0160\u0161\u017D\u017E\u0178\u02C6\u02DC\u2122]/.test(str) || 
         /Ä[\u0080-\u00FF\u0111]/.test(str) || 
         /áº[\u0080-\u00FF]/.test(str) || 
         /á»[\u0080-\u00FF]/.test(str) ||
         /Æ°/.test(str) || 
         /Æ¡/.test(str);
}

function fixCorruptedText(text) {
  return text.replace(/[A-Za-z0-9_\u0080-\uFFFF]+/g, (word) => {
    if (isCorrupted(word)) {
      const fixed = customDecode(word);
      console.log(`[FIXED WORD]: "${word}" -> "${fixed}"`);
      return fixed;
    }
    return word;
  });
}

const filesToFix = [
  path.join(__dirname, 'frontend', 'src', 'features', 'SceneManager', 'ScenePanel.tsx'),
  path.join(__dirname, 'frontend', 'src', 'components', 'MapScene.tsx')
];

filesToFix.forEach(filePath => {
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return;
  }
  console.log(`Processing file: ${filePath}`);
  const content = fs.readFileSync(filePath, 'utf8');
  const fixedContent = fixCorruptedText(content);

  if (content !== fixedContent) {
    fs.writeFileSync(filePath, fixedContent, 'utf8');
    console.log(`Successfully updated: ${filePath}\n`);
  } else {
    console.log(`No changes made to: ${filePath}\n`);
  }
});
