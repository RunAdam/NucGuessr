#!/usr/bin/env python3
"""NucGuessr — traitement des photos (phase 2).

Prend les photos originales de `photos_sources/` (ignoré par git) et leurs crédits
(`photos_sources/credits.csv`), puis pour chaque photo :
  1. applique l'orientation EXIF (photo prise téléphone tourné), puis l'oublie ;
  2. convertit les couleurs en sRGB si la photo a un profil ICC, puis supprime le profil ;
  3. réduit à 1600 px de large (et 1200 px de haut) au maximum ;
  4. encode en WebP, qualité 80, baissée si besoin pour rester sous 300 Ko ;
  5. écrit un fichier SANS AUCUNE MÉTADONNÉE (ni EXIF, ni GPS, ni XMP, ni ICC)
     sous un nom opaque : `<hash>.webp`, hash du CONTENU de l'original (jamais de son nom) ;
  6. met à jour `data/photos.json` (relancer le script ne crée jamais de doublon).

Les images de substitution (`substitut: true`, créées par generate_placeholders.py) d'un site
sont retirées dès que ce site a au moins une vraie photo.

Utilisation (depuis la racine du dépôt) :
    python scripts/process_photos.py              # traite tout
    python scripts/process_photos.py --preparer   # ajoute au CSV une ligne vide par nouvelle image
    python scripts/process_photos.py --verifier   # contrôle data/photos.json et public/photos/ sans rien modifier

Mode d'emploi complet : docs/SOURCING_PHOTOS.md. Dépendance unique : Pillow (voir scripts/requirements.txt).
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import re
import sys
import unicodedata
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageOps

try:  # conversion des profils couleur (présente dans les paquets Pillow officiels)
    from PIL import ImageCms
except ImportError:  # pragma: no cover
    ImageCms = None

# =============================================================================
# Réglages (modifiables)
# =============================================================================

#: Largeur maximale des photos publiées, en pixels.
LARGEUR_MAX = 1600
#: Hauteur maximale (une photo en portrait est réduite davantage ; préférez le paysage).
HAUTEUR_MAX = 1200
#: Qualité WebP de départ (0-100). 80 : pas de défaut visible sur une photo de paysage industriel.
QUALITE_WEBP = 80
#: Si le fichier dépasse ce poids, on baisse la qualité par pas de 5…
POIDS_MAX_OCTETS = 300 * 1024
#: … sans descendre sous cette qualité (au-delà, la photo est gardée avec un avertissement).
QUALITE_MIN = 60
#: Effort de compression WebP (0 rapide … 6 meilleur). 6 : fichiers plus légers, traitement plus lent.
METHODE_WEBP = 6
#: Une photo source plus étroite que ça sera floue en jeu : avertissement.
LARGEUR_SOURCE_CONSEILLEE = 1200
#: Longueur du hash (en caractères hexadécimaux) utilisé comme id et nom de fichier.
LONGUEUR_ID = 16
#: Sel mélangé au hash : empêche de retrouver une photo en comparant son hash à ceux des sites publics.
SEL_HASH = b"NucGuessr/photos/v1"

# =============================================================================
# Constantes du projet
# =============================================================================

RACINE = Path(__file__).resolve().parent.parent
SOURCES_DEFAUT = RACINE / "photos_sources"
SORTIE_DEFAUT = RACINE / "public" / "photos"
JSON_DEFAUT = RACINE / "data" / "photos.json"
NOM_CSV = "credits.csv"
NOM_ETAT = ".etat_traitement.json"  # dans photos_sources/, donc jamais publié

#: Identifiants des 18 sites de la v1 (partagés avec data/sites.json).
SITES = (
    "belleville", "blayais", "bugey", "cattenom", "chinon", "chooz", "civaux", "cruas", "dampierre",
    "flamanville", "golfech", "gravelines", "nogent", "paluel", "penly", "saint-alban", "saint-laurent",
    "tricastin",
)

TYPES = ("sol", "aerienne", "satellite", "detail")
#: Texte alternatif neutre, selon le type : jamais le nom du site.
ALT_PAR_TYPE = {
    "sol": "Photo d'une centrale nucléaire à identifier, vue depuis le sol",
    "aerienne": "Vue aérienne d'une centrale nucléaire à identifier",
    "satellite": "Vue satellite d'une centrale nucléaire à identifier",
    "detail": "Détail d'une centrale nucléaire à identifier",
}
ALT_SUBSTITUT = "Image de test, aucune centrale représentée"

DIFFICULTES = {"1": 1, "facile": 1, "2": 2, "moyenne": 2, "moyen": 2, "3": 3, "difficile": 3}

#: Licences acceptées (forme normalisée). Interdites : NC (pas d'usage commercial) et ND (pas de modification,
#: or on recadre et on floute). Les versions « portées » de Commons (CC-BY-SA-3.0-FR…) sont acceptées.
MOTIF_LICENCE = re.compile(
    r"^(CC0-1\.0|CC-BY(-SA)?-(1\.0|2\.0|2\.5|3\.0|4\.0)(-[A-Z]{2})?|Etalab-2\.0|domaine-public|accord-auteur|image-generee)$"
)
#: Licences qui imposent un lien vers l'original.
LICENCES_SANS_URL = ("accord-auteur", "image-generee")
#: Sources interdites (voir docs/SOURCING_PHOTOS.md) : on refuse une url_source qui y mène.
DOMAINES_INTERDITS = (
    "google.", "gstatic.com", "googleusercontent.com", "bing.com", "edf.fr", "edf.com", "orano.group",
    "orano.com", "cea.fr", "asn.fr", "asnr.fr", "irsn.fr", "pinterest.", "shutterstock.", "gettyimages.",
    "alamy.", "istockphoto.", "adobe.com",
)

EXTENSIONS_IMAGES = (".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".heic", ".bmp")
MOTIF_ID = re.compile(rf"^[0-9a-f]{{{LONGUEUR_ID}}}$")
COLONNES = ("fichier", "site", "type", "difficulte", "auteur", "licence", "url_source")

# =============================================================================
# Outils
# =============================================================================


def sans_accents(texte: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", texte) if unicodedata.category(c) != "Mn")


def normaliser_site(texte: str) -> str:
    t = sans_accents(texte).strip().lower()
    t = re.sub(r"[\s_']+", "-", t)
    t = t.replace("st-", "saint-")
    return {"nogent-sur-seine": "nogent", "saint-laurent-des-eaux": "saint-laurent",
            "saint-alban-du-rhone": "saint-alban", "belleville-sur-loire": "belleville",
            "dampierre-en-burly": "dampierre", "le-blayais": "blayais"}.get(t, t)


def normaliser_licence(texte: str) -> str:
    t = texte.strip()
    if t.lower() in ("domaine public", "domaine-public", "public domain", "pd"):
        return "domaine-public"
    if t.lower() in ("accord-auteur", "accord auteur", "accord de l'auteur", "photo personnelle"):
        return "accord-auteur"
    if t.lower().replace(" ", "-") in ("etalab-2.0", "licence-ouverte-2.0", "lo-2.0", "etalab"):
        return "Etalab-2.0"
    t = re.sub(r"[\s_]+", "-", t.upper())  # « CC BY-SA 3.0 fr » → « CC-BY-SA-3.0-FR »
    if t in ("CC0", "CC-0"):
        return "CC0-1.0"
    return t


def hash_opaque(octets: bytes) -> str:
    """Hash salé du contenu : même contenu → même id ; le nom du fichier n'intervient jamais."""
    return hashlib.sha256(SEL_HASH + octets).hexdigest()[:LONGUEUR_ID]


def encoder_webp(image: Image.Image) -> tuple[bytes, int]:
    """Encode en WebP sans aucune métadonnée. Baisse la qualité si le fichier dépasse POIDS_MAX_OCTETS."""
    # Image neuve, construite pixel par pixel : elle n'hérite d'aucune information (EXIF, XMP, ICC…).
    propre = Image.frombytes("RGB", image.size, image.convert("RGB").tobytes())
    qualite = QUALITE_WEBP
    while True:
        tampon = io.BytesIO()
        propre.save(tampon, "WEBP", quality=qualite, method=METHODE_WEBP)
        octets = tampon.getvalue()
        if len(octets) <= POIDS_MAX_OCTETS or qualite - 5 < QUALITE_MIN:
            return octets, qualite
        qualite -= 5


def vers_srgb(image: Image.Image) -> Image.Image:
    """Convertit en RGB (sRGB si un profil ICC est présent), aplatit la transparence sur du noir."""
    icc = image.info.get("icc_profile")
    if icc and ImageCms is not None:
        try:
            source = ImageCms.ImageCmsProfile(io.BytesIO(icc))
            mode = "RGBA" if image.mode in ("RGBA", "LA", "PA") else "RGB"
            image = ImageCms.profileToProfile(image, source, ImageCms.createProfile("sRGB"), outputMode=mode)
        except Exception:  # profil illisible : on garde les valeurs brutes
            pass
    if image.mode in ("RGBA", "LA", "PA") or (image.mode == "P" and "transparency" in image.info):
        image = image.convert("RGBA")
        fond = Image.new("RGB", image.size, (0, 0, 0))
        fond.paste(image, mask=image.getchannel("A"))
        return fond
    return image.convert("RGB")


def redimensionner(image: Image.Image) -> Image.Image:
    l, h = image.size
    echelle = min(1.0, LARGEUR_MAX / l, HAUTEUR_MAX / h)
    if echelle < 1.0:
        image = image.resize((max(1, round(l * echelle)), max(1, round(h * echelle))), Image.LANCZOS)
    return image


def traiter_image(chemin: Path) -> tuple[bytes, int, int, int, list[str]]:
    """Renvoie (octets WebP, largeur, hauteur, qualité utilisée, avertissements)."""
    avert = []
    with Image.open(chemin) as brute:
        brute.load()
        image = ImageOps.exif_transpose(brute)  # applique l'orientation AVANT de jeter les EXIF
        if image is None:  # pragma: no cover (anciennes versions de Pillow)
            image = brute
        image = vers_srgb(image)
    if image.width < LARGEUR_SOURCE_CONSEILLEE:
        avert.append(f"seulement {image.width} px de large : elle sera floue en jeu")
    if image.height > image.width:
        avert.append("photo en portrait : le jeu est pensé pour le paysage, recadrez-la si possible")
    image = redimensionner(image)
    octets, qualite = encoder_webp(image)
    if len(octets) > POIDS_MAX_OCTETS:
        avert.append(f"{len(octets) // 1024} Ko même en qualité {qualite}")
    return octets, image.width, image.height, qualite, avert


def charger_banque(chemin_json: Path) -> dict:
    if chemin_json.exists():
        with open(chemin_json, encoding="utf-8") as f:
            banque = json.load(f)
    else:
        banque = {}
    banque.setdefault("$schema", "./schema/photos.schema.json")
    banque.setdefault("version", 1)
    banque.setdefault("photos", [])
    return banque


def ordre_photo(p: dict) -> tuple:
    return (p["site_id"], p["substitut"], p["difficulte"], p["id"])


def ecrire_banque(chemin_json: Path, banque: dict) -> bool:
    """Écrit le JSON (trié, stable). Ne touche pas au fichier s'il est identique. Renvoie True s'il a changé."""
    banque = {"$schema": banque["$schema"], "version": banque["version"],
              "photos": sorted(banque["photos"], key=ordre_photo)}
    texte = json.dumps(banque, ensure_ascii=False, indent=2) + "\n"
    if chemin_json.exists() and chemin_json.read_text(encoding="utf-8") == texte:
        return False
    chemin_json.parent.mkdir(parents=True, exist_ok=True)
    chemin_json.write_text(texte, encoding="utf-8", newline="\n")
    return True


def retirer_fichiers_orphelins(banque: dict, dossier: Path) -> list[str]:
    """Supprime de public/photos/ les .webp à nom de hash qui ne sont plus référencés."""
    references = {p["fichier"] for p in banque["photos"]}
    retires = []
    if dossier.exists():
        for f in sorted(dossier.glob("*.webp")):
            if MOTIF_ID.match(f.stem) and f.name not in references:
                f.unlink()
                retires.append(f.name)
    return retires


# =============================================================================
# Lecture de credits.csv
# =============================================================================


@dataclass
class Ligne:
    numero: int
    fichier: str
    site: str
    type: str
    difficulte: int
    auteur: str
    licence: str
    url_source: str | None


def lire_texte(chemin: Path) -> str:
    octets = chemin.read_bytes()
    for encodage in ("utf-8-sig", "cp1252"):  # Excel sous Windows enregistre souvent en cp1252
        try:
            return octets.decode(encodage)
        except UnicodeDecodeError:
            continue
    return octets.decode("latin-1")


def separateur(lignes_texte: list[str]) -> str:
    """`;` (Excel en français) ou `,`, d'après la première ligne utile."""
    premiere = next((l for l in lignes_texte if l.strip() and not l.lstrip().startswith("#")), "")
    return ";" if premiere.count(";") >= premiere.count(",") else ","


def lire_credits(chemin_csv: Path) -> tuple[list[Ligne], list[str], set[str]]:
    """Lit credits.csv (séparateur `;` ou `,`).
    Renvoie (lignes valides, erreurs, noms de tous les fichiers cités, y compris ceux des lignes en erreur)."""
    lignes_texte = lire_texte(chemin_csv).splitlines()
    lecteur = csv.reader(lignes_texte, delimiter=separateur(lignes_texte))
    entete = None
    valides, erreurs, cites = [], [], set()
    for numero, cellules in enumerate(lecteur, start=1):
        if not cellules or all(not c.strip() for c in cellules) or cellules[0].lstrip().startswith("#"):
            continue
        cellules = [c.strip() for c in cellules]
        if entete is None:
            entete = [sans_accents(c).lower() for c in cellules]
            manquantes = [c for c in COLONNES if c not in entete]
            if manquantes:
                return [], [f"{chemin_csv.name}, ligne {numero} : colonnes manquantes dans l'en-tête : {', '.join(manquantes)}"], set()
            continue
        valeurs = {c: (cellules[entete.index(c)] if entete.index(c) < len(cellules) else "") for c in COLONNES}
        cites.add(valeurs["fichier"])
        if not any(valeurs[c] for c in COLONNES if c != "fichier"):
            erreurs.append(f"ligne {numero} ({valeurs['fichier']}) : crédits à remplir")
            continue
        probleme = []
        site = normaliser_site(valeurs["site"])
        if site not in SITES:
            probleme.append(f"site inconnu « {valeurs['site']} » (attendu : {', '.join(SITES)})")
        type_ = sans_accents(valeurs["type"]).lower()
        if type_ not in TYPES:
            probleme.append(f"type « {valeurs['type']} » invalide (sol, aérienne, satellite ou détail)")
        difficulte = DIFFICULTES.get(sans_accents(valeurs["difficulte"]).lower())
        if difficulte is None:
            probleme.append(f"difficulté « {valeurs['difficulte']} » invalide (1 facile, 2 moyenne, 3 difficile)")
        if not valeurs["auteur"]:
            probleme.append("auteur manquant")
        licence = normaliser_licence(valeurs["licence"])
        if licence == "image-generee" or not MOTIF_LICENCE.match(licence):
            probleme.append(
                f"licence « {valeurs['licence']} » refusée (acceptées : CC0, CC BY, CC BY-SA, Etalab 2.0, "
                "domaine public, accord-auteur ; jamais NC ni ND)")
        url = valeurs["url_source"] or None
        if url is None and licence not in LICENCES_SANS_URL:
            probleme.append("url_source obligatoire pour cette licence (lien vers la page de l'original)")
        if url is not None:
            if not url.startswith("https://"):
                probleme.append("url_source doit commencer par https://")
            elif any(d in url.lower() for d in DOMAINES_INTERDITS):
                probleme.append(f"source interdite ({url}) : voir docs/SOURCING_PHOTOS.md")
        if probleme:
            erreurs.append(f"ligne {numero} ({valeurs['fichier'] or 'sans fichier'}) : " + " ; ".join(probleme))
            continue
        valides.append(Ligne(numero, valeurs["fichier"], site, type_, difficulte, valeurs["auteur"], licence, url))
    if entete is None:
        erreurs.append(f"{chemin_csv.name} est vide : il faut au moins la ligne d'en-tête")
    return valides, erreurs, cites


def images_du_dossier(sources: Path) -> list[str]:
    return sorted(
        f.relative_to(sources).as_posix()
        for f in sources.rglob("*")
        if f.is_file() and f.suffix.lower() in EXTENSIONS_IMAGES
    )


def preparer_csv(sources: Path) -> int:
    """Crée credits.csv s'il n'existe pas, et y ajoute une ligne (à compléter) par image non encore listée."""
    chemin_csv = sources / NOM_CSV
    sources.mkdir(parents=True, exist_ok=True)
    deja = set()
    if chemin_csv.exists():
        lignes_texte = lire_texte(chemin_csv).splitlines()
        sep = separateur(lignes_texte)
        for cellules in csv.reader(lignes_texte, delimiter=sep):
            if cellules:
                deja.add(cellules[0].strip())
    else:
        sep = ";"  # le séparateur qu'Excel et LibreOffice en français ouvrent directement
        chemin_csv.write_text(sep.join(COLONNES) + "\n", encoding="utf-8-sig", newline="")
    nouvelles = [f for f in images_du_dossier(sources) if f not in deja]
    with open(chemin_csv, "a", encoding="utf-8", newline="") as f:
        ecrivain = csv.writer(f, delimiter=sep)
        for nom in nouvelles:
            ecrivain.writerow([nom] + [""] * (len(COLONNES) - 1))
    print(f"{len(nouvelles)} ligne(s) ajoutée(s) à {chemin_csv} : remplissez-les, puis relancez sans --preparer.")
    return 0


# =============================================================================
# Traitement principal
# =============================================================================


def traiter(sources: Path = SOURCES_DEFAUT, sortie: Path = SORTIE_DEFAUT, chemin_json: Path = JSON_DEFAUT,
            bavard: bool = True) -> int:
    """Traite photos_sources/ et met à jour la banque. Renvoie le code de sortie (0 si tout va bien)."""
    dire = print if bavard else (lambda *a, **k: None)
    chemin_csv = sources / NOM_CSV
    if not chemin_csv.exists():
        dire(f"Pas de {chemin_csv}. Lancez d'abord : python scripts/process_photos.py --preparer")
        return 1
    lignes, erreurs, cites = lire_credits(chemin_csv)

    banque = charger_banque(chemin_json)
    par_id = {p["id"]: p for p in banque["photos"]}
    chemin_etat = sources / NOM_ETAT
    etat = json.loads(chemin_etat.read_text(encoding="utf-8")) if chemin_etat.exists() else {}
    nouvel_etat: dict[str, str] = {}
    sortie.mkdir(parents=True, exist_ok=True)
    traitees = ajoutees = 0

    for ligne in lignes:
        chemin = sources / ligne.fichier
        if not chemin.is_file():
            erreurs.append(f"ligne {ligne.numero} : fichier introuvable « {ligne.fichier} »")
            continue
        try:
            id_ = hash_opaque(chemin.read_bytes())
            octets, largeur, hauteur, qualite, avert = traiter_image(chemin)
        except Exception as exc:
            erreurs.append(f"ligne {ligne.numero} ({ligne.fichier}) : image illisible ({exc})")
            continue
        for a in avert:
            dire(f"  attention, {ligne.fichier} : {a}")
        if id_ in nouvel_etat.values():
            erreurs.append(f"ligne {ligne.numero} ({ligne.fichier}) : même image qu'une ligne précédente, ignorée")
            continue
        fichier = f"{id_}.webp"
        cible = sortie / fichier
        if not cible.exists() or cible.read_bytes() != octets:
            cible.write_bytes(octets)
        if id_ not in par_id:
            ajoutees += 1
        par_id[id_] = {
            "id": id_,
            "fichier": fichier,
            "site_id": ligne.site,
            "type": ligne.type,
            "difficulte": ligne.difficulte,
            "auteur": ligne.auteur,
            "licence": ligne.licence,
            "url_source": ligne.url_source,
            "alt": ALT_PAR_TYPE[ligne.type],
            "largeur": largeur,
            "hauteur": hauteur,
            "poids_octets": len(octets),
            "substitut": False,
        }
        nouvel_etat[ligne.fichier] = id_
        traitees += 1

    # Photos traitées sur CE poste lors d'un passage précédent, mais dont la ligne a disparu du CSV
    # ou dont l'original a changé (recadrage…) : on retire l'ancienne version.
    # Les photos ajoutées par d'autres membres de la promo ne sont jamais touchées.
    # Une ligne encore présente mais en erreur (crédit mal saisi…) garde sa version précédente.
    retirees = 0
    for nom, ancien_id in etat.items():
        if ancien_id in nouvel_etat.values():
            continue
        if nom in cites and nom not in nouvel_etat:  # ligne en erreur : prudence, on garde l'ancienne version
            nouvel_etat[nom] = ancien_id
        elif ancien_id in par_id and not par_id[ancien_id]["substitut"]:
            del par_id[ancien_id]
            retirees += 1

    # Remplacement des substituts : dès qu'un site a une vraie photo, ses images de test disparaissent.
    sites_reels = {p["site_id"] for p in par_id.values() if not p["substitut"]}
    substituts_retires = [i for i, p in par_id.items() if p["substitut"] and p["site_id"] in sites_reels]
    for i in substituts_retires:
        del par_id[i]

    banque["photos"] = list(par_id.values())
    modifie = ecrire_banque(chemin_json, banque)
    orphelins = retirer_fichiers_orphelins(banque, sortie)
    if sources.exists():
        chemin_etat.write_text(json.dumps(nouvel_etat, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
                               encoding="utf-8")

    dire(f"{traitees} photo(s) traitée(s), dont {ajoutees} nouvelle(s) ; {retirees} ancienne(s) version(s) retirée(s) ; "
         f"{len(substituts_retires)} substitut(s) remplacé(s) ; {len(orphelins)} fichier(s) orphelin(s) supprimé(s).")
    dire(f"{chemin_json.name} {'mis à jour' if modifie else 'inchangé'}.")
    dire(bilan(banque))
    for e in erreurs:
        dire(f"ERREUR {e}")
    return 1 if erreurs else 0


def bilan(banque: dict) -> str:
    lignes = ["Bilan par site (vraies photos / substituts) :"]
    manque = []
    for s in SITES:
        reelles = [p for p in banque["photos"] if p["site_id"] == s and not p["substitut"]]
        subs = sum(1 for p in banque["photos"] if p["site_id"] == s and p["substitut"])
        jouables_r = sum(1 for p in reelles if p["difficulte"] <= 2)
        types = sorted({p["type"] for p in reelles})
        lignes.append(f"  {s:14} {len(reelles)} / {subs}   types : {', '.join(types) or '-'}")
        if len(reelles) < 3 or jouables_r < 2:
            manque.append(s)
    if manque:
        lignes.append(f"Objectif v1 non atteint (≥ 3 vraies photos, dont ≥ 2 de difficulté 1 ou 2) : {', '.join(manque)}")
    return "\n".join(lignes)


# =============================================================================
# Vérification (sans rien modifier)
# =============================================================================

CHAMPS = ("id", "fichier", "site_id", "type", "difficulte", "auteur", "licence", "url_source", "alt",
          "largeur", "hauteur", "poids_octets", "substitut")


def morceaux_riff(octets: bytes) -> list[str]:
    """Liste des blocs d'un fichier WebP (RIFF) : VP8/VP8L/VP8X, et EXIF, XMP, ICCP s'il y en a."""
    if octets[:4] != b"RIFF" or octets[8:12] != b"WEBP":
        raise ValueError("pas un fichier WebP")
    blocs, i = [], 12
    while i + 8 <= len(octets):
        nom = octets[i:i + 4].decode("latin-1")
        taille = int.from_bytes(octets[i + 4:i + 8], "little")
        blocs.append(nom)
        i += 8 + taille + (taille & 1)
    return blocs


def verifier(sortie: Path = SORTIE_DEFAUT, chemin_json: Path = JSON_DEFAUT, bavard: bool = True) -> list[str]:
    """Contrôle la banque et les fichiers publiés. Renvoie la liste des problèmes (vide si tout va bien)."""
    problemes = []
    banque = charger_banque(chemin_json)
    vus = set()
    for p in banque["photos"]:
        nom = p.get("id", "?")
        if set(p) != set(CHAMPS):
            problemes.append(f"{nom} : champs inattendus ou manquants ({sorted(set(p) ^ set(CHAMPS))})")
            continue
        if not MOTIF_ID.match(p["id"]) or p["fichier"] != f"{p['id']}.webp":
            problemes.append(f"{nom} : id ou nom de fichier non opaque")
        if p["id"] in vus:
            problemes.append(f"{nom} : doublon")
        vus.add(p["id"])
        if p["site_id"] not in SITES:
            problemes.append(f"{nom} : site inconnu {p['site_id']}")
        if any(s in sans_accents(p["alt"]).lower() for s in SITES):
            problemes.append(f"{nom} : le texte alt contient un nom de site")
        if p["substitut"] != (p["licence"] == "image-generee"):
            problemes.append(f"{nom} : licence image-generee réservée aux substituts")
        chemin = sortie / p["fichier"]
        if not chemin.is_file():
            problemes.append(f"{nom} : fichier {p['fichier']} absent de {sortie}")
            continue
        octets = chemin.read_bytes()
        try:
            blocs = morceaux_riff(octets)
        except ValueError as exc:
            problemes.append(f"{nom} : {exc}")
            continue
        interdits = [b for b in blocs if b.strip() in ("EXIF", "XMP", "ICCP")]
        if interdits:
            problemes.append(f"{nom} : métadonnées présentes ({', '.join(interdits)})")
        with Image.open(chemin) as im:
            if im.size != (p["largeur"], p["hauteur"]):
                problemes.append(f"{nom} : dimensions {im.size} ≠ {p['largeur']}×{p['hauteur']}")
            if im.width > LARGEUR_MAX:
                problemes.append(f"{nom} : plus de {LARGEUR_MAX} px de large")
        if len(octets) != p["poids_octets"]:
            problemes.append(f"{nom} : poids_octets faux")
    if bavard:
        print(bilan(banque))
        print("Aucun problème." if not problemes else "\n".join(f"PROBLÈME {x}" for x in problemes))
    return problemes


def main(argv: list[str] | None = None) -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    parseur = argparse.ArgumentParser(description="Traite photos_sources/ vers public/photos/ et data/photos.json.")
    parseur.add_argument("--sources", type=Path, default=SOURCES_DEFAUT, help="dossier des originaux (photos_sources/)")
    parseur.add_argument("--sortie", type=Path, default=SORTIE_DEFAUT, help="dossier des photos publiées (public/photos/)")
    parseur.add_argument("--json", type=Path, default=JSON_DEFAUT, help="banque de photos (data/photos.json)")
    parseur.add_argument("--preparer", action="store_true", help="ajoute au CSV une ligne vide par nouvelle image")
    parseur.add_argument("--verifier", action="store_true", help="contrôle la banque sans rien modifier")
    args = parseur.parse_args(argv)
    if args.preparer:
        return preparer_csv(args.sources)
    if args.verifier:
        return 1 if verifier(args.sortie, args.json) else 0
    return traiter(args.sources, args.sortie, args.json)


if __name__ == "__main__":
    sys.exit(main())
