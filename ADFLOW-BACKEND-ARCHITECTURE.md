# AdFlow Backend Architecture
## Service Delivery Workflow

---

## 🎯 Vision

**Input:** Cliente da brief + URL de producto + competidores
**Output:** 15-20 creativos listos para ads en 48h

---

## 📊 Workflow Completo

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ADFLOW SERVICE PIPELINE                           │
└─────────────────────────────────────────────────────────────────────────────┘

     ┌──────────────┐
     │   CLIENTE    │
     │  (Intake)    │
     └──────┬───────┘
            │
            ▼
┌───────────────────────────────────────┐
│  FASE 1: INTAKE & ONBOARDING          │
│  ─────────────────────────────────    │
│  • Brief de campaña (form/call)       │
│  • URLs de productos                  │
│  • Brand assets (logo, colors, fonts) │
│  • Competidores a analizar            │
│  • Objetivos (awareness/conversion)   │
│                                       │
│  📦 Output: Campaign Brief JSON       │
│  🔧 Tool: Typeform/Notion + Supabase  │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│  FASE 2: INTELLIGENCE & STRATEGY      │
│  ─────────────────────────────────    │
│  🧠 AI Ad Creative Strategist         │
│                                       │
│  • Scrape ads de competidores         │
│    (Foreplay API / Meta Ad Library)   │
│  • Identificar winning creatives      │
│    (por engagement, runtime, spend)   │
│  • Extraer hooks, CTAs, estructuras   │
│  • Adaptar estrategia a la marca      │
│                                       │
│  📦 Output: Creative Strategy Doc     │
│     - 5-10 hooks probados             │
│     - 3-5 estructuras de video        │
│     - Ángulos de copy                 │
│     - Recomendaciones visuales        │
│                                       │
│  🔧 Tools: n8n + Gemini + Claude      │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│  FASE 3: ASSET GENERATION             │
│  ─────────────────────────────────    │
│  🎨 Skills de Producción              │
│                                       │
│  IMÁGENES ESTÁTICAS                   │
│  ├─ Ad-Ready Skill                    │
│  │  (URL → Producto + Modelo)         │
│  ├─ Nano Banana Skill                 │
│  │  (Lifestyle ads, mejor fidelidad)  │
│  └─ Manual touchups si necesario      │
│                                       │
│  VIDEO / UGC                          │
│  ├─ VEED Fabric Skill                 │
│  │  (Imagen + Audio → Talking head)   │
│  ├─ Comfy Lipsync Skill               │
│  │  (Alternativa a VEED)              │
│  └─ UGC Creator Skill                 │
│     (Pipeline completo URL→Video)     │
│                                       │
│  COPY / TEXT                          │
│  ├─ Headlines (15 variaciones)        │
│  ├─ Primary text (5 variaciones)      │
│  └─ CTAs adaptados                    │
│                                       │
│  📦 Output: Raw Assets                │
│     - 10-15 imágenes                  │
│     - 3-5 videos UGC                  │
│     - 20+ copy variations             │
│                                       │
│  🔧 Tools: ComfyDeploy, fal.ai,       │
│            ElevenLabs, Claude         │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│  FASE 4: ASSEMBLY & QA                │
│  ─────────────────────────────────    │
│  🔧 Creative Automation Pipeline      │
│                                       │
│  • Resize a múltiples formatos        │
│    (1:1, 4:5, 9:16, 16:9)            │
│  • Añadir overlays de texto           │
│  • Brand consistency check            │
│  • Quality assurance                  │
│  • Nombrar archivos para fácil upload │
│                                       │
│  📦 Output: Final Deliverables        │
│     - Carpeta organizada por formato  │
│     - Naming convention clara         │
│     - Preview deck para cliente       │
│                                       │
│  🔧 Tools: FastAPI backend,           │
│            PIL/ffmpeg, Google Drive   │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│  FASE 5: DELIVERY & HANDOFF           │
│  ─────────────────────────────────    │
│                                       │
│  • Subir a Google Drive/Dropbox       │
│  • Generar preview deck               │
│  • Notificar al cliente               │
│  • Entregar guía de implementación    │
│                                       │
│  📦 Output: Client Deliverable        │
│     - Link a assets                   │
│     - Copy doc                        │
│     - Recomendaciones de testing      │
│                                       │
│  🔧 Tools: Google Drive API, Notion,  │
│            Slack/Email notification   │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│  FASE 6: ITERATION (Opcional)         │
│  ─────────────────────────────────    │
│                                       │
│  • Cliente sube métricas de ads       │
│  • Identificar winners/losers         │
│  • Generar variaciones de winners     │
│  • Nuevo sprint de creativos          │
│                                       │
│  🔧 Tools: Meta API, Google Ads API,  │
│            Dashboard de métricas      │
└───────────────────────────────────────┘
```

---

## 🛠️ Stack Técnico Propuesto

### Orquestación (El Cerebro)
| Opción | Pros | Contras |
|--------|------|---------|
| **n8n** (self-hosted) | Visual, flexible, gratis | Necesita servidor |
| **Make/Zapier** | No-code, rápido | Costoso a escala |
| **FastAPI + Celery** | Control total, escalable | Más desarrollo |

**Recomendación:** Empezar con **n8n** (ya lo usa AI Ad Creative Strategist)

### Base de Datos
| Uso | Tool |
|-----|------|
| Clientes & Briefs | Supabase (ya lo tienes) |
| Assets & Files | Google Drive / S3 |
| Workflows & Logs | Airtable (simple) o Supabase |

### APIs de Generación (Ya las tienes)
| Tipo | Skill/API |
|------|-----------|
| Imágenes con modelo | Ad-Ready (ComfyDeploy) |
| Lifestyle ads | Nano Banana (ComfyDeploy) |
| Video UGC | VEED Fabric (fal.ai) |
| Video alternativo | Comfy Lipsync |
| Voz | ElevenLabs |
| Copy | Claude API |

### Intelligence (Nuevo)
| Función | Tool |
|---------|------|
| Scraping de ads | Foreplay API / Apify |
| Análisis de creativos | Gemini Vision |
| Estrategia | Claude |

---

## 🚀 Plan de Acción: Fases de Construcción

### SEMANA 1-2: Foundation
```
□ Instalar n8n en tu servidor
□ Conectar Supabase como DB
□ Crear workflow básico de intake
□ Diseñar schema de Campaign Brief
```

### SEMANA 3-4: Intelligence Layer
```
□ Integrar Foreplay API (o alternativa)
□ Crear workflow de análisis de competencia
□ Prompt engineering para extracción de hooks
□ Output: Strategy document automático
```

### SEMANA 5-6: Generation Pipeline
```
□ Conectar Ad-Ready skill a n8n
□ Conectar Nano Banana skill a n8n
□ Conectar VEED Fabric para UGC
□ Crear workflow de batch generation
```

### SEMANA 7-8: Assembly & Delivery
```
□ Script de resize multi-formato
□ Automatizar upload a Google Drive
□ Crear template de preview deck
□ Notificaciones automáticas
```

---

## 💰 Modelo de Pricing vs Costo

### Costo por Cliente (estimado)
| Recurso | Costo |
|---------|-------|
| Foreplay API | ~$50/mes (shared) |
| ComfyDeploy (imágenes) | ~$5-15 por cliente |
| fal.ai (videos) | ~$10-20 por cliente |
| ElevenLabs (voz) | ~$5 por cliente |
| Claude API | ~$2-5 por cliente |
| **Total por cliente** | **~$25-50** |

### Tu Pricing
| Tier | Precio | Margen |
|------|--------|--------|
| Sprint básico (15 creativos) | $497 | ~90% |
| Sprint pro (20 creativos + UGC) | $997 | ~95% |
| Retainer mensual | $1,500-2,500 | ~85% |

---

## 🎬 Primer MVP: Qué Construir Primero

### MVP v0.1 (1 semana)
**Objetivo:** Automatizar la generación, no el análisis

```
Intake Form (Typeform)
       │
       ▼
Supabase (guardar brief)
       │
       ▼
n8n Workflow
   ├── Trigger: Nuevo registro en Supabase
   ├── Scrape URL de producto (Puppeteer)
   ├── Generar 5 imágenes (Ad-Ready)
   ├── Generar 1 video UGC (VEED + ElevenLabs)
   ├── Generar copy (Claude)
   └── Subir a Google Drive
       │
       ▼
Notificación (Slack/Email)
```

**Esto ya te da:**
- Workflow semi-automatizado
- Proof of concept funcional
- Base para iterar

---

## ❓ Decisiones Pendientes

1. **¿Foreplay o alternativa?**
   - Foreplay: $99/mes, API oficial
   - Meta Ad Library scraping: Gratis pero más trabajo

2. **¿n8n self-hosted o cloud?**
   - Self-hosted: Gratis, tu servidor
   - Cloud: $20/mes, menos mantenimiento

3. **¿Airtable o todo en Supabase?**
   - Airtable: Más visual para tracking
   - Supabase: Un solo lugar, más técnico

4. **¿Empezar con imágenes o videos?**
   - Imágenes: Más rápido, menos costo
   - Videos: Más valor percibido, más complejo

---

## 📁 Estructura de Proyecto Sugerida

```
adflow-backend/
├── n8n/
│   └── workflows/
│       ├── intake-to-brief.json
│       ├── competitor-analysis.json
│       ├── image-generation.json
│       ├── video-generation.json
│       └── delivery-pipeline.json
├── api/
│   ├── main.py (FastAPI)
│   ├── services/
│   │   ├── scraper.py
│   │   ├── generator.py
│   │   └── assembler.py
│   └── models/
│       └── campaign.py
├── scripts/
│   ├── resize_images.py
│   └── upload_to_drive.py
└── docs/
    └── ARCHITECTURE.md (este archivo)
```

---

*Creado: 2026-03-03*
*Próximo paso: Decidir MVP v0.1 y empezar a construir*
