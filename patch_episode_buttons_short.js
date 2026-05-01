const fs = require('fs');
const bundlePath = require('child_process').execSync('ls /app/public/main_*.js').toString().trim();
let c = fs.readFileSync(bundlePath, 'utf8');

// Shorten the Spanish labels for episode mark/unmark to fit on one line
const replacements = [
  ['"Add episode to seen history":"Marcar episodio como visto"', '"Add episode to seen history":"Visto"'],
  ['"Remove episode from seen history":"Marcar episodio como no visto"', '"Remove episode from seen history":"No visto"'],
];

let count = 0;
for (const [oldS, newS] of replacements) {
  if (c.includes(oldS)) {
    c = c.replace(oldS, newS);
    count++;
  }
}
fs.writeFileSync(bundlePath, c);
console.log('episode buttons short:', count, 'translations updated');
