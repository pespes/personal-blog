import type { AstroIntegration } from "astro";
import { createCipheriv, pbkdf2Sync, randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  PBKDF2_ITERATIONS,
  PROTECTED_END,
  PROTECTED_START,
} from "../utils/protectedContent";

/**
 * Encrypts password-protected case studies after the build.
 *
 * ProtectedContent.astro wraps a case study between two marker elements. Once
 * Astro has written the HTML to dist/, this replaces everything between the
 * markers with AES-256-GCM ciphertext (key derived from WORK_PASSWORD with
 * PBKDF2), which the browser decrypts when the visitor enters the password.
 * It runs before Pagefind, so protected content is never indexed.
 *
 * Not a substitute for real access control: anyone with the password can read
 * and share the content, and images referenced by the case study are
 * published as ordinary files.
 */
export default function protectCaseStudies(): AstroIntegration {
  return {
    name: "protect-case-studies",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const files = await htmlFiles(fileURLToPath(dir));
        let count = 0;

        for (const file of files) {
          const html = await readFile(file, "utf8");
          if (!html.includes(PROTECTED_START)) continue;

          const password = readPassword();
          if (!password) {
            throw new Error(
              `${file} contains a password-protected case study, but WORK_PASSWORD is not set. ` +
                "Set it in .env (locally) or in the Cloudflare Pages build environment."
            );
          }

          await writeFile(file, encryptMarkedContent(html, password));
          count++;
        }

        if (count)
          logger.info(`Encrypted ${count} protected case study page(s).`);
      },
    },
  };
}

function readPassword() {
  if (!process.env.WORK_PASSWORD && existsSync(".env")) {
    process.loadEnvFile(".env");
  }
  return process.env.WORK_PASSWORD;
}

function encryptMarkedContent(html: string, password: string) {
  const start = html.indexOf(PROTECTED_START);
  const end = html.indexOf(PROTECTED_END, start);
  if (end === -1)
    throw new Error("Protected content start marker has no end marker.");

  const plaintext = html.slice(start + PROTECTED_START.length, end);
  const payload = encrypt(plaintext, password);

  return (
    html.slice(0, start) +
    `<div data-protected-cipher="${payload}" data-iterations="${PBKDF2_ITERATIONS}"></div>` +
    html.slice(end + PROTECTED_END.length)
  );
}

/** Returns `salt.iv.ciphertext` (base64), with the GCM auth tag appended to the ciphertext as Web Crypto expects. */
function encrypt(plaintext: string, password: string) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 32, "sha256");
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
    cipher.getAuthTag(),
  ]);
  return [salt, iv, data].map(b => b.toString("base64")).join(".");
}

async function htmlFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter(e => e.isFile() && e.name.endsWith(".html"))
    .map(e => join(e.parentPath, e.name));
}
