"""Tests de la chaîne de traitement des photos (phase 2).

Lancer depuis la racine du dépôt :  python -m unittest discover scripts/tests
Dépendance unique : Pillow. Tout se passe dans des dossiers temporaires, sauf les deux derniers tests
qui contrôlent (sans les modifier) data/photos.json et public/photos/ du dépôt.
"""

from __future__ import annotations

import contextlib
import io
import json
import re
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageCms

DOSSIER_SCRIPTS = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(DOSSIER_SCRIPTS))
import generate_placeholders as gp  # noqa: E402
import process_photos as pp  # noqa: E402

SCHEMA = json.loads((pp.RACINE / "data" / "schema" / "photos.schema.json").read_text(encoding="utf-8"))
ENTETE = "fichier;site;type;difficulte;auteur;licence;url_source\n"


# --- Mini-validateur JSON Schema (le sous-ensemble utilisé par photos.schema.json) ---------------

TYPES_JSON = {"object": dict, "array": list, "string": str, "boolean": bool, "null": type(None)}


def valider(valeur, schema, racine=SCHEMA, chemin="$") -> list[str]:
    if "$ref" in schema:
        cible = racine
        for morceau in schema["$ref"].lstrip("#/").split("/"):
            cible = cible[morceau]
        return valider(valeur, cible, racine, chemin)
    erreurs = []
    if "type" in schema:
        types = schema["type"] if isinstance(schema["type"], list) else [schema["type"]]
        ok = any(
            (t == "integer" and isinstance(valeur, int) and not isinstance(valeur, bool))
            or (t != "integer" and isinstance(valeur, TYPES_JSON[t]) and not (t != "boolean" and isinstance(valeur, bool)))
            for t in types)
        if not ok:
            return [f"{chemin} : type attendu {types}"]
    if "const" in schema and valeur != schema["const"]:
        erreurs.append(f"{chemin} : doit valoir {schema['const']!r}")
    if "enum" in schema and valeur not in schema["enum"]:
        erreurs.append(f"{chemin} : {valeur!r} hors énumération")
    if isinstance(valeur, str):
        if "pattern" in schema and not re.search(schema["pattern"], valeur):
            erreurs.append(f"{chemin} : {valeur!r} ne respecte pas {schema['pattern']}")
        if len(valeur) < schema.get("minLength", 0):
            erreurs.append(f"{chemin} : trop court")
    if isinstance(valeur, int) and not isinstance(valeur, bool):
        if valeur < schema.get("minimum", valeur) or valeur > schema.get("maximum", valeur):
            erreurs.append(f"{chemin} : {valeur} hors bornes")
    if isinstance(valeur, dict):
        for cle in schema.get("required", []):
            if cle not in valeur:
                erreurs.append(f"{chemin} : clé {cle} manquante")
        props = schema.get("properties", {})
        for cle, v in valeur.items():
            if cle in props:
                erreurs += valider(v, props[cle], racine, f"{chemin}.{cle}")
            elif schema.get("additionalProperties") is False:
                erreurs.append(f"{chemin} : clé {cle} non autorisée")
    if isinstance(valeur, list) and "items" in schema:
        for i, v in enumerate(valeur):
            erreurs += valider(v, schema["items"], racine, f"{chemin}[{i}]")
    for sous in schema.get("allOf", []):
        erreurs += valider(valeur, sous, racine, chemin)
    if "not" in schema and not valider(valeur, schema["not"], racine, chemin):
        erreurs.append(f"{chemin} : valeur interdite")
    if "if" in schema:
        branche = "then" if not valider(valeur, schema["if"], racine, chemin) else "else"
        if branche in schema:
            erreurs += valider(valeur, schema[branche], racine, chemin)
    return erreurs


# --- Outils ---------------------------------------------------------------------------------------


def creer_photo_piegee(chemin: Path, largeur=2400, hauteur=1800, couleur=(90, 120, 160)) -> None:
    """JPEG avec tout ce qu'il ne faut pas publier : EXIF (appareil, date, GPS), orientation, profil ICC, XMP."""
    image = Image.new("RGB", (largeur, hauteur), couleur)
    for x in range(0, largeur, 50):  # un peu de contenu pour que l'image ne soit pas uniforme
        image.paste((x % 255, 80, 200 - x % 200), (x, 0, x + 25, hauteur // 2))
    exif = Image.Exif()
    exif[0x010F] = "AppareilTest"  # Make
    exif[0x0110] = "Modele Bugey"  # Model
    exif[0x0132] = "2025:06:01 12:00:00"  # DateTime
    exif[0x010E] = "Centrale nucleaire du Bugey"  # ImageDescription
    exif[0x0112] = 6  # Orientation : rotation de 90° à appliquer
    exif[0x8825] = {1: "N", 2: (45.0, 47.0, 54.0), 3: "E", 4: (5.0, 16.0, 12.0)}  # GPSInfo (Bugey)
    icc = ImageCms.ImageCmsProfile(ImageCms.createProfile("sRGB")).tobytes()
    options = {"exif": exif.tobytes(), "icc_profile": icc, "quality": 92}
    xmp = b'<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:Description>Bugey</rdf:Description></x:xmpmeta>'
    try:
        image.save(chemin, "JPEG", xmp=xmp, **options)
    except TypeError:  # anciennes versions de Pillow
        image.save(chemin, "JPEG", **options)


class BaseTemporaire(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp(prefix="nucguessr_photos_"))
        self.sources = self.tmp / "photos_sources"
        self.sortie = self.tmp / "public" / "photos"
        self.json = self.tmp / "data" / "photos.json"
        self.sources.mkdir(parents=True)

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def ecrire_csv(self, *lignes: str) -> None:
        (self.sources / "credits.csv").write_text(ENTETE + "".join(l + "\n" for l in lignes), encoding="utf-8")

    def traiter(self) -> int:
        return pp.traiter(self.sources, self.sortie, self.json, bavard=False)

    def banque(self) -> dict:
        return json.loads(self.json.read_text(encoding="utf-8"))


LIGNE_BUGEY = "centrale_bugey_GPS.jpg;bugey;aérienne;2;Jean Dupont;CC BY-SA 4.0;https://commons.wikimedia.org/wiki/File:Bugey.jpg"


class TestTraitement(BaseTemporaire):
    def test_sortie_propre(self):
        creer_photo_piegee(self.sources / "centrale_bugey_GPS.jpg")
        self.ecrire_csv(LIGNE_BUGEY)
        self.assertEqual(self.traiter(), 0)
        photos = self.banque()["photos"]
        self.assertEqual(len(photos), 1)
        p = photos[0]

        # Nom opaque : hash hexadécimal, sans rapport avec le nom du site ni le nom d'origine.
        self.assertRegex(p["fichier"], r"^[0-9a-f]{16}\.webp$")
        self.assertEqual(p["fichier"], p["id"] + ".webp")
        for indice in ("bugey", "centrale", "gps"):
            self.assertNotIn(indice, p["fichier"].lower())
        for site in pp.SITES:
            self.assertNotIn(site, p["alt"].lower())
        self.assertNotIn("centrale_bugey", json.dumps(p))
        self.assertEqual([f.name for f in self.sortie.iterdir()], [p["fichier"]])

        chemin = self.sortie / p["fichier"]
        octets = chemin.read_bytes()
        with Image.open(chemin) as im:
            self.assertEqual(im.format, "WEBP")
            self.assertLessEqual(im.width, pp.LARGEUR_MAX)
            self.assertEqual(im.size, (p["largeur"], p["hauteur"]))
            # L'orientation EXIF (6) a été appliquée avant d'être supprimée : l'image est maintenant en portrait.
            self.assertGreater(im.height, im.width)
            self.assertEqual(len(im.getexif()), 0, "il reste des EXIF")
            for cle in ("exif", "xmp", "icc_profile", "XML:com.adobe.xmp"):
                self.assertNotIn(cle, im.info)
        # Contrôle au niveau des octets : aucun bloc de métadonnées dans le RIFF, aucune trace du GPS ni du texte.
        blocs = pp.morceaux_riff(octets)
        self.assertTrue(set(b.strip() for b in blocs) <= {"VP8", "VP8L", "VP8X"}, blocs)
        for trace in (b"Exif", b"GPS", b"Bugey", b"AppareilTest", b"xmpmeta", b"sRGB"):
            self.assertNotIn(trace, octets)
        self.assertEqual(p["poids_octets"], len(octets))
        self.assertEqual(valider(self.banque(), SCHEMA), [])
        self.assertEqual(pp.verifier(self.sortie, self.json, bavard=False), [])

    def test_paysage_reduit_a_1600(self):
        Image.new("RGB", (3000, 2000), (40, 60, 80)).save(self.sources / "a.png")
        self.ecrire_csv("a.png;cruas;sol;1;Promo;accord-auteur;")
        self.assertEqual(self.traiter(), 0)
        p = self.banque()["photos"][0]
        self.assertEqual((p["largeur"], p["hauteur"]), (1600, 1067))
        self.assertIsNone(p["url_source"])
        self.assertEqual(p["licence"], "accord-auteur")

    def test_idempotent(self):
        creer_photo_piegee(self.sources / "centrale_bugey_GPS.jpg")
        Image.new("RGB", (1800, 1200), (10, 200, 30)).save(self.sources / "autre.jpg")
        self.ecrire_csv(LIGNE_BUGEY, "autre.jpg;cruas;detail;3;Promo;accord-auteur;")
        self.assertEqual(self.traiter(), 0)
        texte1 = self.json.read_text(encoding="utf-8")
        fichiers1 = {f.name: f.read_bytes() for f in self.sortie.iterdir()}
        self.assertEqual(self.traiter(), 0)
        self.assertEqual(self.traiter(), 0)
        self.assertEqual(self.json.read_text(encoding="utf-8"), texte1)
        self.assertEqual({f.name: f.read_bytes() for f in self.sortie.iterdir()}, fichiers1)
        self.assertEqual(len(self.banque()["photos"]), 2)

    def test_hash_du_contenu_pas_du_nom(self):
        creer_photo_piegee(self.sources / "centrale_bugey_GPS.jpg")
        self.ecrire_csv(LIGNE_BUGEY)
        self.traiter()
        id1 = self.banque()["photos"][0]["id"]
        (self.sources / "centrale_bugey_GPS.jpg").rename(self.sources / "photo1.jpg")
        self.ecrire_csv(LIGNE_BUGEY.replace("centrale_bugey_GPS.jpg", "photo1.jpg"))
        self.assertEqual(self.traiter(), 0)
        photos = self.banque()["photos"]
        self.assertEqual([p["id"] for p in photos], [id1], "renommer l'original ne doit rien changer")

    def test_original_modifie_remplace_l_ancienne_version(self):
        Image.new("RGB", (1800, 1200), (10, 200, 30)).save(self.sources / "p.jpg")
        self.ecrire_csv("p.jpg;civaux;sol;1;Promo;accord-auteur;")
        self.traiter()
        ancien = self.banque()["photos"][0]["fichier"]
        Image.new("RGB", (1800, 1200), (200, 20, 30)).save(self.sources / "p.jpg")  # recadrée, floutée…
        self.assertEqual(self.traiter(), 0)
        photos = self.banque()["photos"]
        self.assertEqual(len(photos), 1)
        self.assertNotEqual(photos[0]["fichier"], ancien)
        self.assertFalse((self.sortie / ancien).exists())
        # Ligne supprimée du CSV : la photo est retirée de la banque.
        self.ecrire_csv()
        self.assertEqual(self.traiter(), 0)
        self.assertEqual(self.banque()["photos"], [])
        self.assertEqual(list(self.sortie.iterdir()), [])

    def test_credits_refuses(self):
        for nom in ("a.jpg", "b.jpg", "c.jpg", "d.jpg", "e.jpg"):
            Image.new("RGB", (1600, 1000), (len(nom) * 20, 50, 50)).save(self.sources / nom)
        self.ecrire_csv(
            "a.jpg;bugey;sol;1;X;image-generee;",  # réservée aux substituts
            "b.jpg;bugey;sol;1;X;CC BY 4.0;ftp://exemple.org/b.jpg",  # lien invalide
            "c.jpg;fessenheim;sol;1;X;CC0;https://commons.wikimedia.org/wiki/File:C.jpg",  # site hors v1
            "d.jpg;bugey;sol;1;X;CC BY 4.0;",  # lien vers l'original manquant (CC)
            "e.jpg;bugey;sol;;;;",  # crédits pas encore remplis
        )
        self.assertEqual(self.traiter(), 1)
        self.assertEqual(self.banque()["photos"], [])

    def test_credits_usage_interne(self):
        """Usage interne : NC, ND, droits réservés et toute source sont acceptés."""
        for i, nom in enumerate(("a.jpg", "b.jpg", "c.jpg")):
            Image.new("RGB", (1600, 1000), (40 + 80 * i, 200 - 60 * i, 90)).save(self.sources / nom)
        self.ecrire_csv(
            "a.jpg;bugey;sol;1;X;CC BY-NC-ND 4.0;https://www.flickr.com/photos/x/1",
            "b.jpg;bugey;aérienne;2;EDF;Tous droits réservés;https://www.edf.fr/centrale",
            "c.jpg;bugey;sol;3;Y;© droits réservés;",
        )
        self.assertEqual(self.traiter(), 0)
        licences = sorted(p["licence"] for p in self.banque()["photos"])
        self.assertEqual(licences, ["CC-BY-NC-ND-4.0", "droits-reserves", "droits-reserves"])

    def test_csv_virgules_et_variantes(self):
        Image.new("RGB", (1600, 1000), (1, 2, 3)).save(self.sources / "x.jpg")
        (self.sources / "credits.csv").write_text(
            "fichier,site,type,difficulte,auteur,licence,url_source\n"
            "x.jpg,St Laurent,Détail,difficile,A. B.,cc by-sa 3.0 fr,https://commons.wikimedia.org/wiki/File:X.jpg\n",
            encoding="cp1252")
        self.assertEqual(self.traiter(), 0)
        p = self.banque()["photos"][0]
        self.assertEqual((p["site_id"], p["type"], p["difficulte"], p["licence"]),
                         ("saint-laurent", "detail", 3, "CC-BY-SA-3.0-FR"))

    def test_preparer(self):
        Image.new("RGB", (100, 100)).save(self.sources / "nouvelle.jpg")
        with contextlib.redirect_stdout(io.StringIO()):
            pp.preparer_csv(self.sources)
            pp.preparer_csv(self.sources)  # deux fois : pas de ligne en double
        texte = (self.sources / "credits.csv").read_text(encoding="utf-8-sig")
        self.assertEqual(texte.count("nouvelle.jpg"), 1)
        self.assertTrue(texte.startswith("fichier;site;type"))


class TestSubstituts(BaseTemporaire):
    def test_substituts_puis_remplacement(self):
        gp.generer(self.sortie, self.json, bavard=False)
        photos = self.banque()["photos"]
        self.assertEqual(len(photos), 54)
        self.assertEqual(len(list(self.sortie.iterdir())), 54)
        self.assertEqual(valider(self.banque(), SCHEMA), [])
        self.assertEqual(pp.verifier(self.sortie, self.json, bavard=False), [])
        for site in pp.SITES:
            du_site = [p for p in photos if p["site_id"] == site]
            self.assertEqual(sorted(p["difficulte"] for p in du_site), [1, 2, 3])
        for p in photos:
            self.assertTrue(p["substitut"])
            self.assertEqual((p["largeur"], p["hauteur"]), (1600, 1067))
            self.assertLess(p["poids_octets"], 100 * 1024)
            self.assertNotIn(p["site_id"], p["fichier"])
        # Relancer le générateur ne change rien.
        texte = self.json.read_text(encoding="utf-8")
        gp.generer(self.sortie, self.json, bavard=False)
        self.assertEqual(self.json.read_text(encoding="utf-8"), texte)

        # Une vraie photo de Bugey arrive : les 3 substituts de Bugey disparaissent, les autres restent.
        creer_photo_piegee(self.sources / "centrale_bugey_GPS.jpg")
        self.ecrire_csv(LIGNE_BUGEY)
        self.assertEqual(self.traiter(), 0)
        photos = self.banque()["photos"]
        self.assertEqual(len(photos), 52)
        self.assertEqual([p["substitut"] for p in photos if p["site_id"] == "bugey"], [False])
        self.assertEqual(len(list(self.sortie.iterdir())), 52)
        # Et le générateur, relancé, ne remet pas de substituts à Bugey.
        gp.generer(self.sortie, self.json, bavard=False)
        self.assertEqual(len(self.banque()["photos"]), 52)
        self.assertEqual(pp.verifier(self.sortie, self.json, bavard=False), [])


class TestDepot(unittest.TestCase):
    """Contrôle (en lecture seule) la banque réellement présente dans le dépôt."""

    def test_schema_et_sites(self):
        enum = SCHEMA["$defs"]["photo"]["properties"]["site_id"]["enum"]
        self.assertEqual(tuple(enum), pp.SITES)
        self.assertEqual(SCHEMA["$defs"]["photo"]["properties"]["type"]["enum"], list(pp.TYPES))

    def test_banque_du_depot(self):
        if not pp.JSON_DEFAUT.exists():
            self.skipTest("data/photos.json absent")
        banque = json.loads(pp.JSON_DEFAUT.read_text(encoding="utf-8"))
        self.assertEqual(valider(banque, SCHEMA), [])
        self.assertEqual(pp.verifier(pp.SORTIE_DEFAUT, pp.JSON_DEFAUT, bavard=False), [])
        sites = {p["site_id"] for p in banque["photos"]}
        self.assertEqual(sites, set(pp.SITES), "chaque site doit avoir au moins une photo (vraie ou substitut)")


if __name__ == "__main__":
    unittest.main()
