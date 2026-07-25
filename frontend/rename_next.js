const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'out');
const nextDir = path.join(outDir, '_next');
const newNextDir = path.join(outDir, 'next');

if (fs.existsSync(nextDir)) {
  fs.renameSync(nextDir, newNextDir);
}

const items = fs.readdirSync(outDir);
for (const item of items) {
  if (item.startsWith('_')) {
    const itemPath = path.join(outDir, item);
    fs.rmSync(itemPath, { recursive: true, force: true });
  }
}

function replaceInFiles(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      replaceInFiles(filePath);
    } else {
      if (['.html', '.js', '.css', '.json'].includes(path.extname(file))) {
        let content = fs.readFileSync(filePath, 'utf8');
        // replace /_next/ with /next/
        let newContent = content.replace(/\/_next\//g, '/next/');
        // also replace \/_next\/ (escaped slashes) just in case
        newContent = newContent.replace(/\\\/_next\\\//g, '\\/next\\/');
        if (content !== newContent) {
          fs.writeFileSync(filePath, newContent, 'utf8');
        }
      }
    }
  }
}

replaceInFiles(outDir);
console.log("Renamed _next to next and updated references.");
