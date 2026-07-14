const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: JSON_HEADERS,
  });
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return jsonResponse(
      {
        ok: false,
        code: "METHOD_NOT_ALLOWED",
        message: "Método no permitido.",
      },
      405,
    );
  }

  const appsScriptUrl = String(env.APPS_SCRIPT_URL || "").trim();
  if (!appsScriptUrl || !appsScriptUrl.includes("/exec")) {
    return jsonResponse(
      {
        ok: false,
        code: "BACKEND_NOT_CONFIGURED",
        message: "Falta configurar la conexión con Google Apps Script.",
      },
      503,
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(
      {
        ok: false,
        code: "BAD_REQUEST",
        message: "La petición no contiene JSON válido.",
      },
      400,
    );
  }

  const action = String(payload?.action || "").trim();
  if (!action || action.length > 80) {
    return jsonResponse(
      {
        ok: false,
        code: "BAD_ACTION",
        message: "Acción no válida.",
      },
      400,
    );
  }

  const data =
    payload?.data && typeof payload.data === "object" ? payload.data : {};

  const form = new URLSearchParams();
  form.set("transport", "json");
  form.set("action", action);
  form.set("account", String(payload?.account || ""));
  form.set("token", String(payload?.token || ""));
  form.set("data", JSON.stringify(data));

  let upstream;
  try {
    upstream = await fetch(appsScriptUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "Accept": "application/json",
      },
      body: form.toString(),
      redirect: "follow",
    });
  } catch {
    return jsonResponse(
      {
        ok: false,
        code: "BACKEND_UNREACHABLE",
        message: "No se ha podido contactar con Google Apps Script.",
      },
      502,
    );
  }

  const text = await upstream.text();

  let result;
  try {
    result = JSON.parse(text);
  } catch {
    return jsonResponse(
      {
        ok: false,
        code: "BAD_BACKEND_RESPONSE",
        message: "Google Apps Script ha devuelto una respuesta no válida.",
      },
      502,
    );
  }

  return jsonResponse(result, upstream.ok ? 200 : 502);
}
