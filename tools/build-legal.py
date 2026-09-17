#!/usr/bin/env python3
# Genera las paginas legales de Adflow desde un solo armazon.
# Editar el contenido aqui y volver a correr:  python3 tools/build-legal.py
import io, os, sys

ENTITY_ES = """<p>Responsable legal</p>
<p>Adflow Systems LLC</p>
<p>8 The Green, Suite B</p>
<p>Dover, Delaware 19901</p>
<p>Estados Unidos</p>
<p>support@tryadflow.co</p>"""

ENTITY_EN = """<p>Legal entity</p>
<p>Adflow Systems LLC</p>
<p>8 The Green, Suite B</p>
<p>Dover, Delaware 19901</p>
<p>United States</p>
<p>support@tryadflow.co</p>"""

SHELL = """<!doctype html>
<html lang="{htmllang}" data-page="{slug}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="robots" content="index,follow">
<link rel="canonical" href="https://www.tryadflow.co/{slug}">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Instrument+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/legal.css">
<script>
// Respeta el tema elegido en el sitio principal antes del primer pintado.
(function(){{try{{var t=localStorage.getItem('adflow-theme');
if(t)document.documentElement.setAttribute('data-theme',t);}}catch(e){{}}}})();
</script>
</head>
<body>
<nav class="legal-nav"><div class="wrap">
  <a href="/" aria-label="Adflow — inicio"><img src="assets/adflow-lockup-ivory.svg" alt="Adflow" id="lockup"></a>
  <span class="spacer"></span>
  <a class="back" href="/" data-t="back">&larr; Volver al sitio</a>
  <div class="langsw" role="group" aria-label="Idioma / Language">
    <button type="button" data-setlang="es" aria-pressed="true">ES</button>
    <button type="button" data-setlang="en" aria-pressed="false">EN</button>
  </div>
</div></nav>

<main><div class="wrap">
<div data-lang-block="es" class="on">
{body_es}
</div>
<div data-lang-block="en">
{body_en}
</div>
</div></main>

<footer class="legal-foot"><div class="wrap">
  <span>&copy; 2026 Adflow Systems LLC</span>
  <span class="spacer"></span>
  <a href="privacy.html">Privacy</a>
  <a href="terms.html">Terms</a>
  <a href="refunds.html">Billing</a>
  <a href="mailto:support@tryadflow.co">support@tryadflow.co</a>
</div></footer>

<script>
(function(){{
  var blocks=document.querySelectorAll('[data-lang-block]');
  var btns=document.querySelectorAll('[data-setlang]');
  var back=document.querySelector('[data-t="back"]');
  function apply(l){{
    blocks.forEach(function(b){{b.classList.toggle('on', b.dataset.langBlock===l);}});
    btns.forEach(function(b){{b.setAttribute('aria-pressed', String(b.dataset.setlang===l));}});
    document.documentElement.lang=l;
    back.textContent = l==='en' ? '\\u2190 Back to site' : '\\u2190 Volver al sitio';
    try{{localStorage.setItem('adflow-lang',l);}}catch(e){{}}
  }}
  btns.forEach(function(b){{b.addEventListener('click',function(){{apply(b.dataset.setlang);}});}});
  var saved=null; try{{saved=localStorage.getItem('adflow-lang');}}catch(e){{}}
  apply(saved==='en'||(!saved&&(navigator.language||'').slice(0,2)==='en') ? 'en' : 'es');
  // El lockup ivory no se ve sobre fondo claro.
  var lk=document.getElementById('lockup');
  function theme(){{lk.src = document.documentElement.getAttribute('data-theme')==='light'
    ? 'assets/adflow-lockup-ink.svg' : 'assets/adflow-lockup-ivory.svg';}}
  theme();
}})();
</script>
</body></html>
"""

def page(slug, title, desc, body_es, body_en, htmllang="es"):
    html = SHELL.format(slug=slug, title=title, desc=desc,
                        body_es=body_es, body_en=body_en, htmllang=htmllang)
    io.open(slug, "w", encoding="utf-8").write(html)
    print(f"  {slug:16s} {len(html):>7,} bytes")

if __name__ == "__main__":
    root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
    os.chdir(root)
    sys.path.insert(0, os.getcwd())   # legal_content.py vive en la raiz, no en tools/
    from legal_content import PAGES
    print("Generando paginas legales...")
    for p in PAGES:
        page(**p)
    print("Listo.")
