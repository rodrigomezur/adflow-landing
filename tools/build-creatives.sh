#!/usr/bin/env bash
# Optimiza creativos para la seccion #outputs de tryadflow.co y genera el manifiesto.
#
#   1. Deja tus anuncios en  creatives-src/top/  y  creatives-src/bottom/
#      (una carpeta por fila del marquee; el orden es alfabetico)
#   2. Corre:  ./tools/build-creatives.sh
#   3. Los archivos optimizados quedan en assets/creatives/
#      y assets/creatives/manifest.js se regenera solo.
#
# Formatos que acepta: .mp4 .mov .m4v  /  .jpg .jpeg .png .webp
# Convencion opcional de nombre:  <marca>__<loquesea>.mp4  -> la etiqueta al
# hacer hover muestra <marca>. Ej: sharpflow__hook-ferry.mp4
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="$ROOT/creatives-src"
OUT="$ROOT/assets/creatives"

# --- parametros de calidad (ajustables) ---
# Todas las tiles comparten ALTURA y conservan su proporcion original.
# Nada se recorta: un 1:1 sale mas ancho que un 9:16, y asi debe verse.
TILE_H=796          # 398px de tile x2 para pantallas retina
VIDEO_H=960         # los videos aguantan mas resolucion sin pesar tanto
CLIP_SECONDS=6      # duracion del loop; los anuncios largos se recortan
CRF=30              # 28 = mas nitido y pesado, 32 = mas ligero
JPEG_Q=4            # escala mjpeg de ffmpeg: 2 = mejor, 31 = peor

command -v ffmpeg >/dev/null || { echo "Falta ffmpeg. Instalalo con: brew install ffmpeg"; exit 1; }
mkdir -p "$OUT"

# Todo se regenera en cada corrida: limpiamos primero para que no queden
# archivos huerfanos de creativos que ya sacaste de creatives-src/.
find "$OUT" -maxdepth 1 -type f \( -name '*.mp4' -o -name '*.jpg' \) -delete

human () { local b=$1; if [ "$b" -ge 1048576 ]; then printf "%.1f MB" "$(echo "$b/1048576" | bc -l)"; else printf "%d KB" "$((b/1024))"; fi; }

# dimensiones reales del archivo ya procesado (para el aspect-ratio del CSS)
dims_of () { ffprobe -v error -select_streams v:0 -show_entries stream=width,height \
             -of csv=s=x:p=0 "$1" 2>/dev/null | head -1; }

# marca a partir del prefijo  marca__resto.ext
brand_of () { local n; n="$(basename "$1")"; case "$n" in *__*) echo "${n%%__*}";; *) echo "";; esac; }

process_row () {
  local row="$1"
  local dir="$SRC/$row"
  local first=1
  printf '  %s: [\n' "$row"
  [ -d "$dir" ] || { printf '  ],\n'; return; }

  find "$dir" -maxdepth 1 -type f \
       \( -iname '*.mp4' -o -iname '*.mov' -o -iname '*.m4v' \
       -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' -o -iname '*.webp' \) \
       | LC_ALL=C sort | while IFS= read -r f; do

    base="$(basename "${f%.*}")"
    slug="$(echo "$base" | tr '[:upper:] ' '[:lower:]-' | tr -cd 'a-z0-9_-')"
    brand="$(brand_of "$f")"
    ext="$(echo "${f##*.}" | tr '[:upper:]' '[:lower:]')"
    [ $first -eq 1 ] || printf ',\n'; first=0

    case "$ext" in
      mp4|mov|m4v)
        out="$OUT/$slug.mp4"; poster="$OUT/$slug.jpg"
        ffmpeg -y -loglevel error -i "$f" -t "$CLIP_SECONDS" \
          -vf "scale=-2:${VIDEO_H},fps=24" \
          -an -c:v libx264 -crf "$CRF" -preset slow -profile:v main -pix_fmt yuv420p \
          -movflags +faststart "$out" </dev/null
        ffmpeg -y -loglevel error -i "$out" -frames:v 1 -vf "scale=-2:${TILE_H}" -q:v 6 "$poster" </dev/null
        d="$(dims_of "$out")"; vw="${d%x*}"; vh="${d#*x}"
        printf '    { type: "video", src: "assets/creatives/%s.mp4", poster: "assets/creatives/%s.jpg", w: %s, h: %s, brand: "%s", alt: "" }' \
          "$slug" "$slug" "$vw" "$vh" "$brand"
        echo "  video  $(basename "$out")  ${vw}x${vh}  $(human "$(stat -f%z "$out")")" >&2
        ;;
      jpg|jpeg|png|webp)
        out="$OUT/$slug.jpg"
        ffmpeg -y -loglevel error -i "$f" -vf "scale=-2:${TILE_H}" -q:v "$JPEG_Q" "$out" </dev/null
        d="$(dims_of "$out")"; iw="${d%x*}"; ih="${d#*x}"
        printf '    { type: "image", src: "assets/creatives/%s.jpg", w: %s, h: %s, brand: "%s", alt: "" }' \
          "$slug" "$iw" "$ih" "$brand"
        echo "  imagen $(basename "$out")  ${iw}x${ih}  $(human "$(stat -f%z "$out")")" >&2
        ;;
    esac
  done
  printf '\n  ],\n'
}

echo "Procesando creativos..." >&2
{
  echo "// Generado por tools/build-creatives.sh -- no lo edites a mano."
  echo "// Para cambiar que anuncios salen, mueve archivos en creatives-src/ y vuelve a correr el script."
  echo "// El campo alt: describe el anuncio para lectores de pantalla; vale la pena llenarlo."
  echo "window.ADFLOW_CREATIVES = {"
  process_row top
  process_row bottom
  echo "};"
} > "$OUT/manifest.js"

total=$(find "$OUT" -type f \( -name '*.mp4' -o -name '*.jpg' \) -exec stat -f%z {} + 2>/dev/null | awk '{s+=$1} END{print s+0}')
echo "" >&2
echo "Listo. Peso total de la seccion: $(human "$total")" >&2
echo "Manifiesto: assets/creatives/manifest.js" >&2
