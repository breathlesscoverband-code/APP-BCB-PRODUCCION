const PUBLIC_INSTALL_PATHS = new Set([
  "/manifest.webmanifest",
  "/sw.js",
  "/apple-touch-icon.png",
  "/favicon.png",
]);

function isPublicInstallAsset(pathname) {
  return PUBLIC_INSTALL_PATHS.has(pathname) ||
    pathname.startsWith("/icons/");
}

const COOKIE_NAME = "bcb_band_access";
const SESSION_SECONDS = 60 * 60 * 24 * 30;

const encoder = new TextEncoder();

function htmlResponse(body, status = 200, headers = {}) {
  return new Response(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      ...headers,
    },
  });
}

function redirect(location, cookie = "") {
  const headers = {
    Location: location,
    "Cache-Control": "no-store",
  };
  if (cookie) headers["Set-Cookie"] = cookie;
  return new Response(null, { status: 303, headers });
}

function getCookie(request, name) {
  const cookieHeader = request.headers.get("Cookie") || "";
  for (const part of cookieHeader.split(";")) {
    const [key, ...value] = part.trim().split("=");
    if (key === name) return decodeURIComponent(value.join("="));
  }
  return "";
}

function toBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function importHmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function createToken(secret) {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = String(expiresAt);
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload),
  );
  return `${payload}.${toBase64Url(signature)}`;
}

async function validToken(token, secret) {
  if (!token || !token.includes(".")) return false;

  const [payload, signatureText] = token.split(".", 2);
  const expiresAt = Number(payload);

  if (!Number.isFinite(expiresAt)) return false;
  if (expiresAt <= Math.floor(Date.now() / 1000)) return false;

  try {
    const key = await importHmacKey(secret);
    return await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(signatureText),
      encoder.encode(payload),
    );
  } catch {
    return false;
  }
}

function safeReturnPath(value) {
  const path = String(value || "/");
  if (!path.startsWith("/") || path.startsWith("//")) return "/";
  return path;
}

function accessPage(returnPath, errorMessage = "") {
  const safePath = safeReturnPath(returnPath);
  const error = errorMessage
    ? `<div class="error">${errorMessage}</div>`
    : "";

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow,noarchive">
  <title>Acceso privado · Breathless Cover Band</title>
  <style>
    :root{
      color-scheme:dark;
      --navy:#000712;
      --navy2:#0C2344;
      --gold:#E9CA84;
      --gold2:#BC9250;
      --blue:#35A3E5;
      --text:#F4F7FB;
      --muted:#A9B6C9;
      --orange:#FF6A00;
    }
    *{box-sizing:border-box}
    html,body{min-height:100%;margin:0}
    body{
      display:grid;
      place-items:center;
      padding:24px;
      font-family:Arial,Helvetica,sans-serif;
      color:var(--text);
      background:
        radial-gradient(circle at 20% 10%,rgba(53,163,229,.14),transparent 30rem),
        radial-gradient(circle at 80% 0,rgba(233,202,132,.08),transparent 24rem),
        linear-gradient(145deg,var(--navy),var(--navy2));
    }
    .card{
      width:min(100%,430px);
      padding:30px;
      border:1px solid rgba(233,202,132,.25);
      border-radius:22px;
      background:rgba(8,14,25,.94);
      box-shadow:0 30px 90px rgba(0,0,0,.45);
    }
    .eyebrow{
      margin:0 0 10px;
      color:var(--gold);
      font-size:12px;
      font-weight:800;
      letter-spacing:.13em;
      text-transform:uppercase;
    }
    h1{margin:0 0 8px;font-size:28px}
    p{margin:0 0 22px;color:var(--muted);line-height:1.5}
    label{display:block;margin-bottom:8px;font-size:13px;font-weight:700}
    input{
      width:100%;
      padding:14px 15px;
      border:1px solid rgba(255,255,255,.14);
      border-radius:11px;
      outline:none;
      background:#0B1424;
      color:var(--text);
      font-size:16px;
    }
    input:focus{
      border-color:var(--orange);
      box-shadow:0 0 0 3px rgba(255,106,0,.14);
    }
    button{
      width:100%;
      margin-top:14px;
      padding:14px 16px;
      border:0;
      border-radius:11px;
      cursor:pointer;
      background:linear-gradient(90deg,#FF6A00,#FF8A35);
      color:#fff;
      font-size:15px;
      font-weight:800;
    }
    .note{
      margin-top:16px;
      padding:12px 13px;
      border-radius:10px;
      background:rgba(53,163,229,.08);
      color:#BFD3EA;
      font-size:12px;
      line-height:1.45;
    }
    .error{
      margin:0 0 14px;
      padding:11px 12px;
      border:1px solid rgba(255,106,0,.35);
      border-radius:10px;
      background:rgba(255,106,0,.10);
      color:#FFD7BD;
      font-size:13px;
    }
  </style>
</head>
<body>
  <main class="card">
    <p class="eyebrow">Breathless Cover Band</p>
    <h1>Acceso privado</h1>
    <p>Introduce el código compartido de la banda para abrir APP-BCB.</p>
    ${error}
    <form method="post" action="/_bcb_access">
      <input type="hidden" name="returnTo" value="${safePath.replace(/"/g, "&quot;")}">
      <label for="bandCode">Código de la banda</label>
      <input
        id="bandCode"
        name="bandCode"
        type="password"
        autocomplete="current-password"
        required
        autofocus
      >
      <button type="submit">Entrar en APP-BCB</button>
    </form>
    <div class="note">
      Este acceso se recordará durante 30 días en este dispositivo.
      Después, cada miembro seguirá entrando con su nombre y PIN personal.
    </div>
  </main>
</body>
</html>`;
}

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // Chrome debe poder leer manifiesto, iconos y service worker antes del login.
  if (isPublicInstallAsset(url.pathname)) {
    return next();
  }

  const secret = String(env.BAND_ACCESS_CODE || "").trim();

  if (!secret) {
    return htmlResponse(
      "<h1>APP-BCB no está configurada</h1><p>Falta el secreto BAND_ACCESS_CODE en Cloudflare.</p>",
      503,
    );
  }

  if (url.pathname === "/_bcb_logout") {
    return redirect(
      "/",
      `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
    );
  }

  if (url.pathname === "/_bcb_access" && request.method === "POST") {
    const form = await request.formData();
    const enteredCode = String(form.get("bandCode") || "");
    const returnTo = safeReturnPath(form.get("returnTo"));

    if (enteredCode !== secret) {
      return htmlResponse(
        accessPage(returnTo, "El código no es correcto."),
        401,
      );
    }

    const token = await createToken(secret);
    const cookie =
      `${COOKIE_NAME}=${encodeURIComponent(token)}; ` +
      `Path=/; Max-Age=${SESSION_SECONDS}; HttpOnly; Secure; SameSite=Lax`;

    return redirect(returnTo, cookie);
  }

  const token = getCookie(request, COOKIE_NAME);
  if (await validToken(token, secret)) {
    return next();
  }

  const returnTo = `${url.pathname}${url.search}`;
  return htmlResponse(accessPage(returnTo), 401);
}
