# APP-BCB · Frontend privado

Frontend de APP-BCB preparado para:

- GitHub privado como repositorio.
- Cloudflare Pages como alojamiento.
- Cloudflare Access para limitar el acceso a los miembros de la banda.
- Google Apps Script y Google Sheets como backend y base operativa.

## Estructura

```text
public/
  index.html
  _headers
  robots.txt
functions/
  api.js
.gitignore
README.md
```

## Cloudflare Pages

Configuración prevista:

- Framework preset: None.
- Build command: vacío.
- Build output directory: `public`.
- Variable secreta: `APPS_SCRIPT_URL`.
- Valor: la URL activa de Google Apps Script terminada en `/exec`.

No subas PIN, contraseñas, tokens, copias de Google Sheets ni archivos `.gs` con configuración privada.
