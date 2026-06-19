const { generateKeyPairSync } = require('crypto');

function escapeForEnv(pem) {
  return pem.replace(/\r?\n/g, '\\n');
}

const access = generateKeyPairSync('ec', {
  namedCurve: 'prime256v1', // P-256 for ES256
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const refresh = generateKeyPairSync('ec', {
  namedCurve: 'secp521r1', // P-521 for ES512
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

const out = {
  JWT_ACCESS_TOKEN_PRIVATE_KEY: escapeForEnv(access.privateKey),
  JWT_ACCESS_TOKEN_PUBLIC_KEY: escapeForEnv(access.publicKey),
  JWT_REFRESH_TOKEN_PRIVATE_KEY: escapeForEnv(refresh.privateKey),
  JWT_REFRESH_TOKEN_PUBLIC_KEY: escapeForEnv(refresh.publicKey),
};

console.log(JSON.stringify(out, null, 2));
