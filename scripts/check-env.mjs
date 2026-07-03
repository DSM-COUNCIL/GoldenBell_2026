import { loadDotenv, summarizeEnv, validateFirebaseEnv } from "./env-utils.mjs";

const dotenv = loadDotenv();
const result = validateFirebaseEnv(process.env);

console.log(`.env.local: ${dotenv.loaded ? "present" : "missing"}`);

for (const item of summarizeEnv(process.env)) {
  console.log(`${item.present ? "ok" : "missing"} ${item.key}`);
}

for (const warning of result.warnings) {
  console.warn(`warning ${warning}`);
}

if (!result.ok) {
  for (const error of result.errors) {
    console.error(`error ${error}`);
  }

  process.exit(1);
}

console.log("Firebase environment looks ready.");
