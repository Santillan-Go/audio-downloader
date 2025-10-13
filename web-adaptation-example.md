# Adaptación Web - Ejemplo

## Cambios necesarios para versión web:

### 1. Reemplazar Tauri APIs:

```typescript
// Desktop (Tauri):
import { fetch } from "@tauri-apps/api/http";
import { downloadDir } from "@tauri-apps/api/path";

// Web (Browser):
import { fetch } from "browser"; // fetch nativo
// downloadDir → usar browser download API
```

### 2. Sistema de descargas:

```typescript
// Desktop: Escribir a filesystem
await downloadFile(downloadsPath, cleanFileName, wavBuffer);

// Web: Trigger browser download
const blob = new Blob([wavBuffer], { type: "audio/wav" });
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = cleanFileName;
a.click();
```

### 3. Configuración:

```typescript
// Desktop: Archivo de config en sistema
await writeTextFile("config.json", data);

// Web: localStorage o backend
localStorage.setItem("splicedd-config", JSON.stringify(data));
```

## Arquitectura Web sugerida:

```
React App (Vercel/Netlify)
    ↓
Splice GraphQL API (directo)
    ↓
Browser Downloads (limitado)
```

O con backend:

```
React App → Node.js API → Splice API
              ↓
         File Management
```
