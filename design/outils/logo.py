"""
Génère le wordmark et le favicon de NucGuessr en SVG, avec le texte converti en tracés
(aucune dépendance à une police installée chez le joueur).

Le symbole est une case de la carte des nucléides : un élément fictif « Ng » dont le nombre de masse,
en exposant à gauche comme dans ²³⁵U, est « ? » : l'isotope reste à deviner.

Sorties :
  src/assets/wordmark.svg       case + « NucGuessr », couleurs de la palette (fond transparent)
  src/assets/wordmark-mono.svg  même dessin en currentColor (à insérer en ligne, hérite de la couleur)
  src/assets/symbole.svg        case seule, fond transparent
  public/favicon.svg            case seule sur fond --c-fond (lisible sur onglet clair ou sombre)

Dépendance : fontTools + brotli (lecture des WOFF2), à installer hors du dépôt :
  pip install --target <dossier temporaire> fonttools brotli
  PYTHONPATH=<dossier temporaire> python design/outils/logo.py
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

RACINE = Path(__file__).resolve().parents[2]
SANS = TTFont(RACINE / "public/fonts/ibm-plex-sans/ibm-plex-sans-latin-600-normal.woff2")
MONO = TTFont(RACINE / "public/fonts/ibm-plex-mono/ibm-plex-mono-latin-600-normal.woff2")

TEXTE = "#e4eaf0"   # --c-texte
ACCENT = "#4db8ff"  # --c-accent
FOND = "#0a0e13"    # --c-fond


def largeur(police, texte, taille, interlettre=0.0):
    upm = police["head"].unitsPerEm
    cmap, hmtx = police.getBestCmap(), police["hmtx"]
    return sum(hmtx[cmap[ord(c)]][0] for c in texte) * taille / upm + interlettre * (len(texte) - 1)


def trace(police, texte, x, y, taille, interlettre=0.0):
    """Chemin SVG du texte, ligne de base en y, origine en x."""
    upm = police["head"].unitsPerEm
    gs, cmap, hmtx = police.getGlyphSet(), police.getBestCmap(), police["hmtx"]
    s = taille / upm
    d = []
    for c in texte:
        nom = cmap[ord(c)]
        pen = SVGPathPen(gs, lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
        gs[nom].draw(TransformPen(pen, (s, 0, 0, -s, x, y)))
        d.append(pen.getCommands())
        x += hmtx[nom][0] * s + interlettre
    return " ".join(d)


def case(x0, y0, cote, trait, accent, texte, fond=None):
    """Case de nucléide : carré, « ? » en exposant à gauche, « Ng » en symbole."""
    elems = []
    if fond:
        elems.append(f'<rect x="{x0}" y="{y0}" width="{cote}" height="{cote}" fill="{fond}"/>')
    m = trait / 2
    elems.append(f'<rect x="{x0 + m}" y="{y0 + m}" width="{cote - trait}" height="{cote - trait}" fill="none" stroke="{accent}" stroke-width="{trait}"/>')
    t_sym = cote * 0.50
    w_sym = largeur(SANS, "Ng", t_sym)
    x_sym = x0 + cote - cote * 0.14 - w_sym
    y_sym = y0 + cote * 0.76
    t_q = cote * 0.34
    elems.append(f'<path fill="{accent}" d="{trace(MONO, "?", x0 + cote * 0.12, y0 + cote * 0.40, t_q)}"/>')
    elems.append(f'<path fill="{texte}" d="{trace(SANS, "Ng", x_sym, y_sym, t_sym)}"/>')
    return "\n  ".join(elems)


def svg(largeur_vb, hauteur_vb, contenu, titre):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {largeur_vb:.1f} {hauteur_vb}" role="img" aria-label="{titre}">\n'
            f'  <title>{titre}</title>\n  {contenu}\n</svg>\n')


def wordmark(texte_c, accent_c):
    H = 32
    t = 23
    x_txt = H + 10
    w = largeur(SANS, "NucGuessr", t, -0.2)
    contenu = case(0, 0, H, 1.5, accent_c, texte_c)
    contenu += f'\n  <path fill="{texte_c}" d="{trace(SANS, "NucGuessr", x_txt, 24.5, t, -0.2)}"/>'
    return svg(x_txt + w + 1, H, contenu, "NucGuessr")


if __name__ == "__main__":
    (RACINE / "src/assets").mkdir(parents=True, exist_ok=True)
    (RACINE / "src/assets/wordmark.svg").write_text(wordmark(TEXTE, ACCENT), encoding="utf-8")
    (RACINE / "src/assets/wordmark-mono.svg").write_text(wordmark("currentColor", "currentColor"), encoding="utf-8")
    (RACINE / "src/assets/symbole.svg").write_text(svg(32, 32, case(0, 0, 32, 1.5, ACCENT, TEXTE), "NucGuessr"), encoding="utf-8")
    (RACINE / "public/favicon.svg").write_text(svg(32, 32, case(0, 0, 32, 2.5, ACCENT, TEXTE, FOND), "NucGuessr"), encoding="utf-8")
    for f in ("src/assets/wordmark.svg", "src/assets/wordmark-mono.svg", "src/assets/symbole.svg", "public/favicon.svg"):
        print(f, (RACINE / f).stat().st_size, "octets")
