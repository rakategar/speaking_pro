#!/usr/bin/env node
// Generates the env values for /analyst login. The password is never stored
// in plaintext anywhere -- only the scrypt hash goes into .env.local.
//
//   node scripts/analyst-hash.mjs '<password>'
//
// Then put the printed lines in .env.local (gitignored) and restart the app.
// Rotating ANALYST_SESSION_SECRET logs out every existing session.

import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];
if (!password) {
  console.error("Usage: node scripts/analyst-hash.mjs '<password>'");
  process.exit(1);
}

const salt = randomBytes(16);
const hash = scryptSync(password, salt, 32).toString("hex");

// Colon-separated: dotenv expands $NAME inside values, so a "$" separator
// would silently truncate the hash when the app reads it back.
console.log(`ANALYST_PASSWORD_HASH="scrypt:${salt.toString("hex")}:${hash}"`);
console.log(`ANALYST_SESSION_SECRET="${randomBytes(32).toString("hex")}"`);
