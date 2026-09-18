# CLIPSTUDIO AI

Aplicacion web para crear videoclips musicales profesionales a partir de una
cancion e imagenes, con un flujo simple: subir cancion, subir imagenes, elegir
estilo, generar storyboard automatico, animar las imagenes (efecto Ken Burns),
previsualizar y exportar un MP4 real.

## Stack

- React + TypeScript + Vite + Tailwind CSS
- Zustand para estado global
- IndexedDB (via `idb`) para almacenamiento local de proyectos y archivos
- Web Audio API para analisis real de audio (duracion, forma de onda, BPM,
  segmentacion en intro/verso/coro/puente/outro)
- Canvas 2D para el renderizado de movimientos de camara y color grading
- `@ffmpeg/ffmpeg` (WebAssembly) para la exportacion real a MP4 (H.264 + AAC),
  con procesamiento por segmentos para videos de 3-4 minutos

## Desarrollo

```bash
npm install
npm run dev
```

`npm run build` compila TypeScript y genera el bundle de produccion.

## Estado del proyecto (desarrollo por fases)

**Fase 1 (implementada):** autenticacion no incluida aun (proyectos locales
por navegador), creacion de proyecto, subida de cancion e imagenes,
almacenamiento local, timeline, movimientos de camara, transiciones, preview,
exportacion MP4 real y autoguardado.

**Fase 2 (implementada):** analisis real de audio (BPM, secciones), letra
manual/importada (TXT/SRT/LRC), storyboard automatico, asistente de IA
(CLIPSTUDIO AI ASSISTANT) basado en reglas locales.

**Fase 3 (arquitectura lista, requiere backend):** generacion de escenas por
IA, lip sync y transcripcion automatica estan implementadas como interfaces de
proveedor (`src/providers/*`) que llaman a un backend propio. Si no se
configuran las variables de entorno correspondientes, la interfaz lo indica
claramente como "proveedor de IA no configurado" en vez de simular un
resultado.

## Variables de entorno (proveedores de IA opcionales)

Ninguna clave de API vive en el frontend. Estas variables solo apuntan a
endpoints de un backend propio que resguarda las claves reales:

```
VITE_VIDEO_GEN_ENDPOINT=
VITE_LIPSYNC_ENDPOINT=
VITE_TRANSCRIPTION_ENDPOINT=
VITE_IMAGE_GEN_ENDPOINT=
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Sin backend configurado, el almacenamiento usa IndexedDB local (funcional) y
las funciones de IA generativa muestran su estado como no configurado.
