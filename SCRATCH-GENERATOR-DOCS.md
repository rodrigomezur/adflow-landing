# AdFlow Scratch Generator
## Documentación Técnica y de Producto

**URL:** https://www.tryadflow.co/scratch  
**Fecha:** Marzo 2026  
**Estado:** MVP Funcional

---

## 🎯 ¿Qué es el Scratch Generator?

El **Scratch Generator** es una herramienta de generación de creativos publicitarios que permite crear variaciones de anuncios a partir de:

1. **Una imagen de producto** (obligatoria)
2. **Ads de referencia** (opcionales, para copiar el estilo)
3. **Un brief creativo** (headline, CTA)
4. **URL del producto** (opcional, para research automático)

El sistema usa **IA generativa** para crear múltiples variaciones de anuncios listos para usar en Meta Ads, Google Ads, etc.

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCRATCH GENERATOR FLOW                        │
└─────────────────────────────────────────────────────────────────┘

     ┌──────────────┐
     │   USUARIO    │
     │  (Frontend)  │
     └──────┬───────┘
            │
            ▼
┌───────────────────────────────────────┐
│  PASO 1: INPUTS                        │
│  ─────────────────────────────        │
│  • Imagen de producto (base64)        │
│  • Ads de referencia (hasta 3)        │
│  • Headline / Brief creativo          │
│  • CTA (Shop Now, Learn More, etc.)   │
│  • URL de producto (opcional)         │
│  • Opciones: idioma, aspect ratio     │
└───────────────────┬───────────────────┘
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
┌─────────────────┐    ┌─────────────────┐
│  RESEARCH API   │    │   (Skip si no   │
│  /api/scratch/  │    │   hay URL)      │
│   research.js   │    │                 │
│                 │    │                 │
│  • Scrape URL   │    │                 │
│  • Extrae info  │    │                 │
│  • Gemini 2.5   │    │                 │
└────────┬────────┘    └─────────────────┘
         │
         ▼
┌───────────────────────────────────────┐
│  PASO 2: CREATIVE DIRECTOR            │
│  /api/scratch/plan.js                 │
│  ─────────────────────────────        │
│  • Recibe: producto + refs + brief    │
│  • Analiza style de referencias       │
│  • Genera N variaciones únicas        │
│  • Crea prompts para cada variación   │
│                                       │
│  🧠 Modelo: Gemini 2.5 Flash          │
│  📦 Output: JSON con plan de prompts  │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│  PASO 3: IMAGE GENERATION             │
│  /api/scratch/generate.js             │
│  ─────────────────────────────        │
│  • Recibe: prompt + producto + refs   │
│  • Genera imagen para cada variación  │
│  • Incluye texto overlay (headline)   │
│                                       │
│  🎨 Modelo: Nano Banana 2             │
│     (gemini-3.1-flash-image-preview)  │
│  📦 Output: Imágenes base64           │
└───────────────────┬───────────────────┘
                    │
                    ▼
┌───────────────────────────────────────┐
│  PASO 4: DISPLAY & DOWNLOAD           │
│  Frontend (scratch.html)              │
│  ─────────────────────────────        │
│  • Grid de variaciones generadas      │
│  • Preview modal individual           │
│  • Download individual o bulk         │
│  • Regenerar variaciones              │
└───────────────────────────────────────┘
```

---

## 📁 Estructura de Archivos

```
adflow-landing/
├── scratch.html              # Frontend de la herramienta
├── api/
│   └── scratch/
│       ├── research.js       # Scraper + análisis de URL
│       ├── plan.js           # Creative Director (genera prompts)
│       └── generate.js       # Generación de imágenes
├── vercel.json               # Config de Vercel
└── SCRATCH-GENERATOR-DOCS.md # Este documento
```

---

## 🔧 APIs Detalladas

### 1. Research API (`/api/scratch/research`)

**Propósito:** Extraer inteligencia de una URL de producto para mejorar los prompts.

**Request:**
```json
{
  "productUrl": "https://example.com/product"
}
```

**Proceso:**
1. Hace fetch de la URL con headers de browser
2. Extrae HTML y lo limpia (quita scripts, styles, nav, footer)
3. Envía el contenido a Gemini 2.5 Flash para análisis
4. Extrae: nombre, beneficios, pain points, USPs, target audience, sugerencias

**Response:**
```json
{
  "success": true,
  "url": "https://example.com/product",
  "intelligence": {
    "productName": "Product Name",
    "brand": "Brand",
    "category": "supplements",
    "price": "$29.99",
    "coreBenefit": "Main benefit in one sentence",
    "benefits": ["benefit 1", "benefit 2"],
    "painPoints": ["problem 1", "problem 2"],
    "targetAudience": {
      "demographics": "Women 25-45",
      "psychographics": "Health-conscious, busy professionals"
    },
    "socialProof": {
      "hasReviews": true,
      "trustSignals": ["10,000+ sold", "FDA approved"]
    },
    "uniqueSellingPoints": ["USP 1", "USP 2"],
    "suggestedHeadlines": ["Headline 1", "Headline 2"],
    "visualRecommendations": {
      "style": "minimal",
      "colors": ["white", "green"],
      "mood": "clean and trustworthy"
    }
  }
}
```

---

### 2. Plan API (`/api/scratch/plan`)

**Propósito:** Actuar como "Creative Director" - analizar referencias y generar prompts únicos para cada variación.

**Request:**
```json
{
  "productName": "Creatine Gummies",
  "productImageBase64": "base64...",
  "productImageMimeType": "image/jpeg",
  "referenceImagesBase64": [
    { "base64": "...", "mimeType": "image/jpeg" }
  ],
  "headline": "The Creatine Gummies Everyone Loves",
  "cta": "Shop Now",
  "options": {
    "variations": 3,
    "language": "en",
    "aspectRatio": "4:5"
  },
  "intelligence": { /* from research API */ }
}
```

**Proceso:**
1. Construye prompt multimodal con:
   - Reglas de copywriting (headlines cortos, 6-8 palabras)
   - Framework de Nano Banana 2 (Subject + Action + Location + Style + Text)
   - Análisis de referencias (composición, colores, mood)
   - Intelligence del producto (si disponible)
2. Envía a Gemini 2.5 Flash con imágenes
3. Parsea JSON de respuesta

**Response:**
```json
{
  "success": true,
  "plan": {
    "referenceAnalysis": "Hand holding product, beige background, minimal aesthetic...",
    "variations": [
      {
        "id": 1,
        "angle": "social-proof",
        "strategy": "hero-product",
        "headline": "5,000+ Five-Star Reviews",
        "subheadline": "The gummies everyone's talking about",
        "cta": "Shop Now",
        "prompt": "Detailed prompt describing: hand holding product against beige background, text '5,000+ Five-Star Reviews' at top, clean minimal aesthetic...",
        "textPlacement": "top",
        "colorScheme": "warm beige and white",
        "mood": "trustworthy and premium"
      },
      // ... más variaciones
    ]
  }
}
```

**Framework de Headlines (reglas del prompt):**
- Máximo 6-8 palabras
- Usar power words: Free, New, Proven, Secret, Finally, Instant
- Incluir números cuando sea relevante
- Fórmulas probadas:
  - `[Number] + [Benefit]`: "5,000+ Five-Star Reviews"
  - `[Pain Point] + [Solution]`: "No Powders. No Bloat."
  - `[Desire] + [Product]`: "Creatine You'll Actually Crave"

**Ángulos de Ad (cada variación usa uno diferente):**
1. Social Proof - reviews, bestseller
2. Benefit-Focused - transformación
3. Pain Point - problema → solución
4. Urgency - tiempo limitado
5. Curiosity - pregunta, secreto
6. Lifestyle - identidad aspiracional
7. Comparison - "Unlike others..."

---

### 3. Generate API (`/api/scratch/generate`)

**Propósito:** Generar la imagen final usando Nano Banana 2.

**Request:**
```json
{
  "prompt": "Detailed prompt from plan...",
  "headline": "5,000+ Five-Star Reviews",
  "cta": "Shop Now",
  "productImageBase64": "base64...",
  "productImageMimeType": "image/jpeg",
  "referenceImagesBase64": [...],
  "aspectRatio": "4:5",
  "variationId": 1
}
```

**Proceso:**
1. Construye prompt multimodal:
   - Referencias primero (para que el modelo capture el estilo)
   - Imagen de producto (debe aparecer exactamente así)
   - Instrucciones de estilo y texto
2. Llama a `gemini-3.1-flash-image-preview` (Nano Banana 2)
3. Extrae imagen del response

**Response:**
```json
{
  "success": true,
  "imageUrl": "data:image/png;base64,...",
  "imageMimeType": "image/png",
  "variationId": 1,
  "aspectRatio": "4:5",
  "model": "nano-banana-2"
}
```

---

## 🖥️ Frontend (scratch.html)

### Estructura de UI

```
┌─────────────────────────────────────────────────────────────────┐
│  Header: Logo + Back Link                                       │
├─────────────────────────┬───────────────────────────────────────┤
│                         │                                       │
│  SIDEBAR (400px)        │  MAIN AREA (flex)                     │
│                         │                                       │
│  ┌─────────────────┐    │  ┌─────────────────────────────────┐  │
│  │ 1. PRODUCT      │    │  │                                 │  │
│  │ • URL input     │    │  │  Grid de imágenes generadas     │  │
│  │ • Image upload  │    │  │  (2-4 columnas responsive)      │  │
│  └─────────────────┘    │  │                                 │  │
│                         │  │  Cada imagen tiene:             │  │
│  ┌─────────────────┐    │  │  • Preview                      │  │
│  │ 2. REFERENCES   │    │  │  • Headline overlay             │  │
│  │ • 3 slots       │    │  │  • Download button              │  │
│  └─────────────────┘    │  │  • Regenerate button            │  │
│                         │  │                                 │  │
│  ┌─────────────────┐    │  └─────────────────────────────────┘  │
│  │ 3. CREATIVE     │    │                                       │
│  │ • Headline      │    │  Estado vacío:                        │
│  │ • CTA selector  │    │  "Upload product + Add brief"         │
│  │ • Variations    │    │                                       │
│  └─────────────────┘    │  Loading:                             │
│                         │  "Generating X variations..."         │
│  [GENERATE BUTTON]      │                                       │
│                         │                                       │
├─────────────────────────┴───────────────────────────────────────┤
│  Preview Modal (click en imagen)                                │
│  • Imagen grande                                                │
│  • Datos de variación                                           │
│  • Download                                                     │
└─────────────────────────────────────────────────────────────────┘
```

### Features del Frontend

1. **Smart Research Toggle:** Si el usuario ingresa URL, puede activar "Research product automatically" para extraer inteligencia.

2. **Reference Ads:** Hasta 3 imágenes de referencia. El sistema analiza su estilo y lo replica.

3. **CTA Presets:** Botones rápidos para CTAs comunes (Shop Now, Learn More, Get Yours, Try Now, etc.)

4. **Opciones Avanzadas:**
   - Aspect Ratio (1:1, 4:5, 9:16)
   - Idioma (EN, ES, PT)
   - Número de variaciones (1-6)
   - Precio y subheadline opcionales

5. **Grid Responsive:** 2 columnas en mobile, 3-4 en desktop.

6. **Preview Modal:** Click en imagen abre modal con:
   - Imagen a tamaño completo
   - Headline y ángulo usado
   - Botón de download

---

## 🧠 Modelos de IA Usados

| Componente | Modelo | Propósito |
|------------|--------|-----------|
| Research | Gemini 2.5 Flash | Análisis de texto, extracción de insights |
| Creative Director | Gemini 2.5 Flash | Multimodal: analiza imágenes + genera prompts |
| Image Generation | Nano Banana 2 (`gemini-3.1-flash-image-preview`) | Genera imágenes con texto overlay |

### ¿Por qué estos modelos?

- **Gemini 2.5 Flash:** Rápido, barato, bueno para análisis y generación de texto estructurado (JSON).
- **Nano Banana 2:** El único modelo que genera imágenes con texto legible integrado. Crítico para ads.

---

## 💰 Costos Estimados

| Operación | Costo Aproximado |
|-----------|------------------|
| Research (1 URL) | ~$0.002 |
| Plan (3 variaciones) | ~$0.01 |
| Generate (1 imagen) | ~$0.03-0.05 |
| **Total por sesión (3 ads)** | **~$0.15-0.20** |

---

## 🚀 Cómo lo Construimos (Timeline)

### Fase 1: Concepto (Semana 1)
- Diseño del flujo de usuario
- Definición de APIs necesarias
- Prototipo de UI en HTML

### Fase 2: Research Agent (Semana 2)
- Implementación del scraper
- Integración con Gemini para análisis
- Testing con diferentes URLs (Shopify, WooCommerce, etc.)

### Fase 3: Creative Director (Semana 3)
- Framework de prompts para Nano Banana 2
- Reglas de copywriting (headlines cortos)
- Sistema de ángulos y estrategias
- Análisis multimodal de referencias

### Fase 4: Image Generation (Semana 4)
- Integración con Nano Banana 2
- Handling de imágenes base64
- Optimización de prompts para texto legible

### Fase 5: Frontend Polish (Semana 5)
- UI dark theme
- Grid responsive
- Preview modal
- Download functionality
- Loading states

---

## 🐛 Problemas Resueltos

1. **Texto ilegible en imágenes:** Solucionado usando Nano Banana 2 que tiene capacidad nativa de renderizar texto.

2. **Headlines muy largos:** Agregamos reglas estrictas en el prompt del Creative Director (max 6-8 palabras).

3. **Variaciones demasiado similares:** Implementamos sistema de "ángulos" obligatorios (cada variación debe usar un ángulo diferente).

4. **Referencias ignoradas:** Movimos las imágenes de referencia al INICIO del prompt y agregamos instrucciones explícitas de copiar el estilo.

5. **Timeouts en generación:** Compresión de imágenes a 512px y 60% quality antes de enviar a la API.

---

## 🔮 Próximos Pasos

- [ ] Batch download (ZIP de todas las variaciones)
- [ ] Guardar proyectos en Supabase
- [ ] History de generaciones previas
- [ ] Templates de campañas pre-hechas
- [ ] Integración con Meta Ads API para subir directo
- [ ] Video generation (UGC con VEED Fabric)

---

## 📞 Variables de Entorno

```env
GEMINI_API_KEY=your-gemini-api-key
```

---

*Documentación creada: 2026-03-16*
*Última actualización: 2026-03-16*
