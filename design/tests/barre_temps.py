"""
Test « métaphore de la barre de temps » : la barre dit-elle la vérité sur le temps restant,
et le saut de −2 s se voit-il ?

Entrées : les captures design/captures/barre-<variante>-<t>s.png et barre-<variante>-{avant,apres}-erreur.png
produites par design/outils/capturer.mjs (zone de la barre seulement, 1280 px de large).

Mesures :
  - part affichée = pixels « accent » / (pixels accent + pixels « rail vide »). C'est ce que l'œil lit
    d'un coup : la quantité de bleu qui reste. On la compare à la part réelle t / 20 s.
  - saut −2 s : part des pixels de la barre de couleur « erreur » juste après une erreur
    (segment perdu visible), et présence de l'étiquette « −2 s ».

Usage : python -I design/tests/barre_temps.py  > design/tests/barre_temps-sortie.txt
"""
import sys
from pathlib import Path
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")
CAPTURES = Path(__file__).resolve().parents[1] / "captures"
ACCENT = (0x4D, 0xB8, 0xFF)
RAIL = (0x16, 0x1E, 0x27)
ERREUR = (0xFF, 0x6B, 0x5E)
DUREE = 20


def proche(p, c, tol=8):  # aplats CSS : tolérance faible, sinon le fond de page passerait pour le rail
    return all(abs(a - b) <= tol for a, b in zip(p[:3], c))


def compter(img, couleur):
    return sum(1 for p in img.getdata() if proche(p, couleur))


print("Barre de temps : part affichée (ce que l'œil lit) contre part réelle du temps restant")
print(f"{'variante':<10} {'restant':>8} {'réel':>6} {'affiché':>8} {'écart (s)':>10}")
for variante in ["lineaire", "expo", "grappes"]:
    for t in [15, 10, 5]:
        img = Image.open(CAPTURES / f"barre-{variante}-{t}s.png").convert("RGB")
        a, r = compter(img, ACCENT), compter(img, RAIL)
        affiche = a / (a + r) if a + r else 0
        reel = t / DUREE
        print(f"{variante:<10} {t:>6} s {reel:>6.0%} {affiche:>8.0%} {(affiche - reel) * DUREE:>+9.1f}")

print()
print("Saut de −2 s : pixels « erreur » dans la zone de la barre, avant et juste après une erreur")
print(f"{'variante':<10} {'avant':>7} {'après':>7} {'part de la barre':>17}")
for variante in ["lineaire", "expo", "grappes"]:
    av = Image.open(CAPTURES / f"barre-{variante}-avant-erreur.png").convert("RGB")
    ap = Image.open(CAPTURES / f"barre-{variante}-apres-erreur.png").convert("RGB")
    e_av, e_ap = compter(av, ERREUR), compter(ap, ERREUR)
    total = compter(ap, ACCENT) + compter(ap, RAIL) + e_ap
    print(f"{variante:<10} {e_av:>7} {e_ap:>7} {e_ap / total:>16.1%}")
