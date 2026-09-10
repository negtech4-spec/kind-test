export const AUTH_COOKIE = "kp_admin_session";
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8;

const encoder = new TextEncoder();

function sessionSecret() {
  return process.env.ADMIN_SESSION_SECRET ?? "";
}

export function isAdminAuthConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD && sessionSecret().length >= 32);
}

function toBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function sign(value: string) {
  const secret = sessionSecret();
  if (!secret || !globalThis.crypto?.subtle) return null;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return toBase64Url(new Uint8Array(signature));
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

export async function createAdminSession() {
  if (!isAdminAuthConfigured()) return null;
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = `v1.${issuedAt}`;
  const signature = await sign(payload);
  return signature ? `${payload}.${signature}` : null;
}

export async function verifyAdminSession(value: string | undefined) {
  if (!value || !isAdminAuthConfigured()) return false;
  const [version, issuedAtRaw, signature, ...extra] = value.split(".");
  if (extra.length || version !== "v1" || !issuedAtRaw || !signature) return false;

  const issuedAt = Number(issuedAtRaw);
  const now = Math.floor(Date.now() / 1000);
  if (!Number.isInteger(issuedAt) || issuedAt > now || now - issuedAt > ADMIN_SESSION_MAX_AGE) {
    return false;
  }

  const expected = await sign(`${version}.${issuedAtRaw}`);
  return Boolean(expected && safeEqual(signature, expected));
}
