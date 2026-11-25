"""
Contraste WCAG 2.x de chaque paire couleur de texte / fond utilisée dans l'interface.

Lit les couleurs directement dans src/styles/tokens.css (palette retenue « Tcherenkov »), et compare
avec la palette candidate « Graphite » (valeurs recopiées du prototype direction A).

Seuils (WCAG 2.1 niveau AA) :
  - texte courant : 4,5:1 ;
  - grand texte (≥ 24 px, ou ≥ 18,66 px en gras) : 3:1 ;
  - composants d'interface et éléments graphiques porteurs d'information (contour du champ,
    barre de temps, marqueurs de carte) : 3:1 (critère 1.4.11).
Les couleurs semi-transparentes (rgb(... / a)) sont composées sur leur fond avant le calcul.

Usage : python -I design/tests/contraste.py  > design/tests/contraste-sortie.txt
Code de sortie 1 si une paire échoue dans la palette retenue.
"""
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
TOKENS = Path(__file__).resolve().parents[2] / "src" / "styles" / "tokens.css"


def lire_tokens():
    css = TOKENS.read_text(encoding="utf-8")
    racine = css.split("@media")[0]  # uniquement le bloc :root principal
    return dict(re.findall(r"--([\w-]+):\s*([^;]+);", racine))


def rgba(valeur):
    v = valeur.strip()
    if v.startswith("#"):
        h = v[1:]
        return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) + (1.0,)
    m = re.match(r"rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*/\s*([\d.]+)\s*\)", v)
    if m:
        return (int(m[1]), int(m[2]), int(m[3]), float(m[4]))
    raise ValueError(v)


def composer(avant, fond):
    a = avant[3]
    return tuple(round(avant[i] * a + fond[i] * (1 - a)) for i in range(3)) + (1.0,)


def luminance(c):
    def lin(x):
        x /= 255
        return x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4
    r, g, b = (lin(x) for x in c[:3])
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(c1, c2):
    l1, l2 = sorted((luminance(c1), luminance(c2)), reverse=True)
    return (l1 + 0.05) / (l2 + 0.05)


# (avant-plan, fond, fond sous-jacent si le fond est transparent, seuil, usage)
PAIRES = [
    ("c-texte", "c-fond", None, 4.5, "texte principal sur le fond"),
    ("c-texte", "c-surface", None, 4.5, "texte principal sur un panneau"),
    ("c-texte", "c-surface-2", None, 4.5, "saisie du joueur dans le champ"),
    ("c-texte", "c-accent-doux", "c-surface", 4.5, "suggestion active (fond accent doux)"),
    ("c-texte-2", "c-fond", None, 4.5, "texte secondaire, libellés"),
    ("c-texte-2", "c-surface", None, 4.5, "texte secondaire sur panneau"),
    ("c-texte-2", "c-surface-2", None, 4.5, "suggestions non actives"),
    ("c-texte-3", "c-fond", None, 4.5, "texte tertiaire, unités, graduations"),
    ("c-texte-3", "c-surface-2", None, 4.5, "TEXTE FANTÔME de l'autocomplétion"),
    ("c-accent", "c-fond", None, 4.5, "accent : chrono, record, liens actifs"),
    ("c-accent", "c-surface-2", None, 3.0, "barre de temps (accent) sur son rail"),
    ("c-sur-accent", "c-accent", None, 4.5, "texte du bouton principal (aplat accent)"),
    ("c-succes", "c-fond", None, 4.5, "statut succès (texte, coche)"),
    ("c-succes", "c-surface-2", None, 3.0, "contour du champ validé"),
    ("c-erreur", "c-fond", None, 4.5, "statut erreur (texte, croix, « −2 s »)"),
    ("c-erreur", "c-surface-2", None, 3.0, "contour du champ en erreur, segment perdu sur le rail"),
    ("c-erreur", "c-erreur-doux", "c-surface-2", 4.5, "texte d'erreur sur halo d'erreur"),
    ("c-trait-fort", "c-fond", None, 3.0, "contour du champ de saisie (composant)"),
    ("c-trait-fort", "c-surface-2", None, 3.0, "contour du champ sur sa surface"),
    ("c-accent", "c-trait-fort", None, 1.0, "(info) focus vs contour au repos"),
    # Carte du mode Distance
    ("carte-frontiere", "carte-mer", None, 3.0, "carte : contour de la France sur la mer"),
    ("carte-terre", "carte-mer", None, 1.0, "(info) terre vs mer, aplats"),
    ("carte-fleuve", "carte-terre", None, 1.5, "carte : fleuves (repère discret, non essentiel)"),
    ("carte-ville", "carte-terre", None, 4.5, "carte : noms de villes"),
    ("carte-marqueur-joueur", "carte-terre", None, 3.0, "carte : marqueur du joueur"),
    ("carte-marqueur-reponse", "carte-terre", None, 3.0, "carte : marqueur de la réponse"),
    ("carte-trait", "carte-terre", None, 3.0, "carte : trait proposition → réponse"),
]

GRAPHITE = {
    "c-fond": "#0d0d0e", "c-surface": "#151516", "c-surface-2": "#1c1c1e", "c-trait-fort": "#5f5f66",
    "c-texte": "#ececec", "c-texte-2": "#a8a8ad", "c-texte-3": "#8a8a90",
    "c-accent": "#3d8bff", "c-accent-doux": "rgb(61 139 255 / 0.16)", "c-sur-accent": "#ffffff",
    "c-succes": "#4cc38a", "c-erreur": "#f2555a", "c-erreur-doux": "rgb(242 85 90 / 0.16)",
}


def evaluer(palette, nom):
    print(f"\n=== Palette {nom} ===")
    print(f"{'avant-plan':<24}{'fond':<18}{'ratio':>7}{'seuil':>7}  {'':<6}usage")
    echecs = 0
    for avant, fond, dessous, seuil, usage in PAIRES:
        if avant not in palette or fond not in palette:
            continue
        f = rgba(palette[fond])
        if f[3] < 1:
            f = composer(f, rgba(palette[dessous]))
        a = rgba(palette[avant])
        if a[3] < 1:
            a = composer(a, f)
        r = ratio(a, f)
        ok = r >= seuil
        info = seuil <= 1.0 or seuil == 1.5
        etat = "info" if info else ("OK" if ok else "ÉCHEC")
        if not ok and not info:
            echecs += 1
        print(f"{avant:<24}{fond:<18}{r:>6.2f}:1{seuil:>6.1f}  {etat:<6}{usage}")
    print(f"--> {echecs} échec(s)")
    return echecs


if __name__ == "__main__":
    retenue = lire_tokens()
    e = evaluer(retenue, "Tcherenkov (retenue, src/styles/tokens.css)")
    graphite = dict(retenue)
    graphite.update(GRAPHITE)
    evaluer(graphite, "Graphite (candidate écartée)")
    sys.exit(1 if e else 0)
