const { generateKeyPairSync } = require('crypto');
const fs = require('fs');
const path = require('path');

function escapeForEnv(pem) {
  return pem.replace(/\r?\n/g, '\\n');
}

const access = generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const refresh = generateKeyPairSync('ec', {
  namedCurve: 'secp521r1',
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const envPath = path.resolve(__dirname, '..', '.env');
const examplePath = path.resolve(__dirname, '..', '.env.example');

let exampleContent = fs.existsSync(examplePath) ? fs.readFileSync(examplePath, 'utf8') : '';
let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

const envMap = {};
envContent.split(/\r?\n/).forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    envMap[match[1]] = match[2];
  }
});

// Inject our new keys
envMap['JWT_ACCESS_TOKEN_PRIVATE_KEY'] = `"${escapeForEnv(access.privateKey)}"`;
envMap['JWT_ACCESS_TOKEN_PUBLIC_KEY'] = `"${escapeForEnv(access.publicKey)}"`;
envMap['JWT_REFRESH_TOKEN_PRIVATE_KEY'] = `"${escapeForEnv(refresh.privateKey)}"`;
envMap['JWT_REFRESH_TOKEN_PUBLIC_KEY'] = `"${escapeForEnv(refresh.publicKey)}"`;

let newEnv = exampleContent.split(/\r?\n/).map(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    const key = match[1];
    if (envMap.hasOwnProperty(key)) {
      return `${key}=${envMap[key]}`;
    }
  }
  return line;
}).join('\n');

// Append any existing variables from .env that weren't in .env.example
const exampleKeys = new Set();
exampleContent.split(/\r?\n/).forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) exampleKeys.add(match[1]);
});

for (const key of Object.keys(envMap)) {
  if (!exampleKeys.has(key)) {
    newEnv += `\n${key}=${envMap[key]}`;
  }
}

fs.writeFileSync(envPath, newEnv.trim() + '\n', 'utf8');
console.log('Applied generated JWT keys to .env and synchronized with .env.example');
