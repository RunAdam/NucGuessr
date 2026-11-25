#!/usr/bin/env python3
"""NucGuessr — images de substitution (« PHOTO DE TEST »), en attendant les vraies photos.

Crée 3 images par site (54 pour les 18 sites) dans public/photos/ et les inscrit dans data/photos.json
avec `substitut: true`, pour que le jeu soit jouable de bout en bout pendant le développement.

Règles :
  - l'image ne contient JAMAIS le nom du site : seulement « PHOTO DE TEST » et un numéro opaque ;
  - la teinte et la composition sont tirées au hasard pour chaque image, sans lien avec le site ;
  - 1600 × 1067 px (paysage 3:2, comme une vraie photo), WebP sans métadonnées, nom = hash du contenu ;
  - un site qui a déjà au moins une vraie photo ne reçoit pas de substituts ;
  - le résultat est déterministe : relancer le script ne change rien et ne crée aucun doublon.

Les 3 substituts d'un site couvrent les 3 difficultés (1 vue au sol, 2 aérienne, 3 détail), pour pouvoir
tester le filtre du mode Rapidité (voir RAPIDITE_DIFFICULTE_MAX dans src/config.ts).

Utilisation (depuis la racine du dépôt) :
    python scripts/generate_placeholders.py
    python scripts/generate_placeholders.py --retirer   # supprime tous les substituts
"""

from __future__ import annotations

import argparse
import colorsys
import hashlib
import random
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, str(Path(__file__).resolve().parent))
import process_photos as pp  # noqa: E402  (réutilise l'encodage WebP, le hash et l'écriture du JSON)

LARGEUR, HAUTEUR = 1600, 1067
PAR_SITE = 3
#: (type, difficulté) des substituts successifs d'un site.
MODELES = (("sol", 1), ("aerienne", 2), ("detail", 3))
AUTEUR = "Image générée par scripts/generate_placeholders.py"


def police(taille: int):
    try:
        return ImageFont.load_default(size=taille)  # police vectorielle intégrée à Pillow ≥ 10.1
    except (TypeError, OSError):  # pragma: no cover
        return ImageFont.load_default()


def dessiner(graine: bytes, numero: str) -> Image.Image:
    """Dégradé sombre de teinte aléatoire, quadrillage d'instrumentation, collines génériques, texte."""
    alea = random.Random(graine)
    teinte = alea.random()
    haut = tuple(round(255 * c) for c in colorsys.hsv_to_rgb(teinte, 0.45, 0.30))
    bas = tuple(round(255 * c) for c in colorsys.hsv_to_rgb((teinte + 0.08) % 1, 0.35, 0.08))
    image = Image.new("RGB", (LARGEUR, HAUTEUR))
    d = ImageDraw.Draw(image)
    for y in range(HAUTEUR):
        t = y / (HAUTEUR - 1)
        d.line([(0, y), (LARGEUR, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip(haut, bas)))
    trait = tuple(min(255, c + 22) for c in haut)
    pas = alea.choice((80, 100, 120))
    for x in range(0, LARGEUR, pas):
        d.line([(x, 0), (x, HAUTEUR)], fill=trait, width=1)
    for y in range(0, HAUTEUR, pas):
        d.line([(0, y), (LARGEUR, y)], fill=trait, width=1)
    # Ligne d'horizon générique (aucune silhouette de centrale : rien à reconnaître).
    horizon = alea.randint(int(HAUTEUR * 0.55), int(HAUTEUR * 0.75))
    points, x = [(0, HAUTEUR)], 0
    while x <= LARGEUR:
        points.append((x, horizon + alea.randint(-40, 40)))
        x += alea.randint(120, 260)
    points += [(LARGEUR, horizon), (LARGEUR, HAUTEUR)]
    d.polygon(points, fill=tuple(max(0, c - 10) for c in bas))
    clair = (226, 232, 236)
    for texte, taille, y in (("PHOTO DE TEST", 120, HAUTEUR // 2 - 120), (f"image de substitution  n° {numero}", 40, HAUTEUR // 2 + 30)):
        f = police(taille)
        boite = d.textbbox((0, 0), texte, font=f)
        d.text(((LARGEUR - (boite[2] - boite[0])) // 2, y), texte, font=f, fill=clair)
    return image


def substituts_du_site(site: str) -> list[dict]:
    entrees = []
    for k, (type_, difficulte) in enumerate(MODELES[:PAR_SITE]):
        graine = hashlib.sha256(pp.SEL_HASH + f"substitut/{site}/{k}".encode()).digest()
        numero = graine.hex()[:4].upper()  # opaque : ne permet pas de retrouver le site
        octets, _ = pp.encoder_webp(dessiner(graine, numero))
        id_ = pp.hash_opaque(octets)
        entrees.append({
            "id": id_,
            "fichier": f"{id_}.webp",
            "site_id": site,
            "type": type_,
            "difficulte": difficulte,
            "auteur": AUTEUR,
            "licence": "image-generee",
            "url_source": None,
            "alt": pp.ALT_SUBSTITUT,
            "largeur": LARGEUR,
            "hauteur": HAUTEUR,
            "poids_octets": len(octets),
            "substitut": True,
            "_octets": octets,
        })
    return entrees


def generer(sortie: Path = pp.SORTIE_DEFAUT, chemin_json: Path = pp.JSON_DEFAUT, retirer: bool = False,
            bavard: bool = True) -> int:
    banque = pp.charger_banque(chemin_json)
    reelles = {p["site_id"] for p in banque["photos"] if not p["substitut"]}
    photos = [p for p in banque["photos"] if not p["substitut"]]  # on repart de zéro pour les substituts
    sortie.mkdir(parents=True, exist_ok=True)
    crees = 0
    if not retirer:
        for site in pp.SITES:
            if site in reelles:
                continue
            for e in substituts_du_site(site):
                octets = e.pop("_octets")
                cible = sortie / e["fichier"]
                if not cible.exists() or cible.read_bytes() != octets:
                    cible.write_bytes(octets)
                photos.append(e)
                crees += 1
    banque["photos"] = photos
    modifie = pp.ecrire_banque(chemin_json, banque)
    orphelins = pp.retirer_fichiers_orphelins(banque, sortie)
    if bavard:
        poids = sum(p["poids_octets"] for p in photos if p["substitut"])
        print(f"{crees} substitut(s) en place ({poids / 1024:.0f} Ko au total) ; "
              f"{len(reelles)} site(s) ont déjà de vraies photos ; {len(orphelins)} fichier(s) orphelin(s) supprimé(s) ; "
              f"{chemin_json.name} {'mis à jour' if modifie else 'inchangé'}.")
    return 0


def main(argv: list[str] | None = None) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parseur = argparse.ArgumentParser(description="Génère les images de substitution (3 par site sans vraie photo).")
    parseur.add_argument("--sortie", type=Path, default=pp.SORTIE_DEFAUT)
    parseur.add_argument("--json", type=Path, default=pp.JSON_DEFAUT)
    parseur.add_argument("--retirer", action="store_true", help="supprime tous les substituts")
    args = parseur.parse_args(argv)
    return generer(args.sortie, args.json, args.retirer)


if __name__ == "__main__":
    sys.exit(main())
