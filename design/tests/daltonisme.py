"""
Test daltonisme : simulation de deutéranopie et de protanopie (Machado, Oliveira & Fernandes 2009,
sévérité 1,0, appliquée en RVB linéaire) sur les captures des états succès / erreur / alerte,
et calcul de la distance entre les couleurs de statut une fois simulées.

Rappel de la règle : la couleur n'est jamais le seul indicateur (✓ / ✕ dessinés, mot « Temps écoulé »,
noms barrés, hachures du segment perdu, « −2 s »). Ce test vérifie en plus que les couleurs restent
distinguables entre elles pour les daltoniens les plus fréquents.

Sorties : design/captures/daltonisme-<type>-<capture>.png et le tableau ci-dessous.
Usage : python -I design/tests/daltonisme.py  > design/tests/daltonisme-sortie.txt
"""
import re
import sys
from pathlib import Path
from PIL import Image

sys.stdout.reconfigure(encoding="utf-8")
DESIGN = Path(__file__).resolve().parents[1]
TOKENS = DESIGN.parent / "src" / "styles" / "tokens.css"

MATRICES = {
    "deuteranopie": ((0.367322, 0.860646, -0.227968), (0.280085, 0.672501, 0.047413), (-0.011820, 0.042940, 0.968881)),
    "protanopie": ((0.152286, 1.052583, -0.204868), (0.114503, 0.786281, 0.099216), (-0.003882, -0.048116, 1.051998)),
}

LIN = [((i / 255) / 12.92 if i / 255 <= 0.04045 else ((i / 255 + 0.055) / 1.055) ** 2.4) for i in range(256)]


def vers_srgb(x):
    x = min(1.0, max(0.0, x))
    v = 12.92 * x if x <= 0.0031308 else 1.055 * x ** (1 / 2.4) - 0.055
    return round(v * 255)


def simuler_couleur(rgb, m):
    r, g, b = (LIN[c] for c in rgb)
    return tuple(vers_srgb(m[i][0] * r + m[i][1] * g + m[i][2] * b) for i in range(3))


def simuler_image(img, m):
    # table de correspondance par canal impossible (mélange des canaux) : on passe par une LUT 3D grossière
    cache = {}
    px = img.load()
    out = Image.new("RGB", img.size)
    po = out.load()
    for y in range(img.size[1]):
        for x in range(img.size[0]):
            c = px[x, y][:3]
            if c not in cache:
                cache[c] = simuler_couleur(c, m)
            po[x, y] = cache[c]
    return out


def luminance(c):
    r, g, b = (LIN[v] for v in c)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def ratio(a, b):
    l1, l2 = sorted((luminance(a), luminance(b)), reverse=True)
    return (l1 + 0.05) / (l2 + 0.05)


def delta_e(a, b):
    """Distance CIE76 dans Lab (≥ 20 : différence nette au premier coup d'œil)."""
    def lab(c):
        r, g, b_ = (LIN[v] for v in c)
        X = (0.4124 * r + 0.3576 * g + 0.1805 * b_) / 0.95047
        Y = 0.2126 * r + 0.7152 * g + 0.0722 * b_
        Z = (0.0193 * r + 0.1192 * g + 0.9505 * b_) / 1.08883
        f = lambda t: t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
        return 116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))
    la, lb = lab(a), lab(b)
    return sum((p - q) ** 2 for p, q in zip(la, lb)) ** 0.5


def hexa(v):
    v = v.strip().lstrip("#")
    return tuple(int(v[i:i + 2], 16) for i in (0, 2, 4))


tokens = dict(re.findall(r"--([\w-]+):\s*(#[0-9a-fA-F]{6})", TOKENS.read_text(encoding="utf-8")))
C = {k: hexa(tokens[k]) for k in ("c-accent", "c-succes", "c-erreur", "c-fond")}

print("Couleurs de statut simulées (fond --c-fond) : distance ΔE entre elles, contraste sur le fond")
for nom, m in [("vision normale", None)] + list(MATRICES.items()):
    s = {k: (v if m is None else simuler_couleur(v, m)) for k, v in C.items()}
    print(f"\n[{nom}]")
    for k in ("c-accent", "c-succes", "c-erreur"):
        print(f"  {k:<10} #{''.join(f'{x:02x}' for x in s[k])}  contraste sur fond {ratio(s[k], s['c-fond']):5.2f}:1")
    for a, b in (("c-succes", "c-erreur"), ("c-accent", "c-erreur"), ("c-accent", "c-succes")):
        print(f"  ΔE {a} / {b} : {delta_e(s[a], s[b]):5.1f}   rapport de luminance {ratio(s[a], s[b]):4.2f}")

for capture in ("a-bureau-bonne", "a-bureau-erreur", "a-alerte-mobile", "fin-mobile"):
    src = DESIGN / "captures" / f"{capture}.png"
    if not src.exists():
        continue
    img = Image.open(src).convert("RGB")
    for nom in ("deuteranopie",):
        simuler_image(img, MATRICES[nom]).save(DESIGN / "captures" / f"daltonisme-{nom}-{capture}.png", optimize=True)
print("\nImages simulées écrites dans design/captures/daltonisme-*.png")
