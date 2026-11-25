"""
Rend les prototypes HTML de design/ autonomes (ouverture par double-clic, sans serveur).

Pour chaque fichier HTML passé en argument, remplace sur place :
  - le bloc  /*@tokens:debut*/ ... /*@tokens:fin*/   par le contenu de src/styles/tokens.css ;
  - le bloc  /*@polices:debut famille:400,600 autre:400*/ ... /*@polices:fin*/
    par des @font-face dont les WOFF2 sont embarqués en base64 (data: URI).

Les polices sont cherchées d'abord dans public/fonts/ (polices retenues), puis dans le dossier
indiqué par la variable d'environnement NUCG_POLICES_CANDIDATES (polices candidates, téléchargées
avec `npm pack @fontsource/<famille>` dans un dossier temporaire hors du dépôt).

L'opération est idempotente : on peut relancer le script après chaque modification.

Usage :  python -I design/outils/embarquer.py design/direction-a-synoptique.html design/direction-b-plan.html
"""
import base64
import os
import re
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parents[2]

FAMILLES = {
    "ibm-plex-sans": "IBM Plex Sans",
    "ibm-plex-mono": "IBM Plex Mono",
    "jetbrains-mono": "JetBrains Mono",
    "space-grotesk": "Space Grotesk",
    "barlow-semi-condensed": "Barlow Semi Condensed",
    "space-mono": "Space Mono",
}


def trouver(nom_fichier: str) -> Path:
    dossiers = [RACINE / "public" / "fonts"]
    if os.environ.get("NUCG_POLICES_CANDIDATES"):
        dossiers.append(Path(os.environ["NUCG_POLICES_CANDIDATES"]))
    for d in dossiers:
        for p in d.rglob(nom_fichier):
            return p
    raise FileNotFoundError(f"{nom_fichier} introuvable (définir NUCG_POLICES_CANDIDATES ?)")


def font_faces(spec: str) -> str:
    regles = []
    for item in spec.split():
        slug, graisses = item.split(":")
        for g in graisses.split(","):
            p = trouver(f"{slug}-latin-{g}-normal.woff2")
            b64 = base64.b64encode(p.read_bytes()).decode("ascii")
            regles.append(
                "@font-face{font-family:'%s';font-style:normal;font-weight:%s;font-display:swap;"
                "src:url(data:font/woff2;base64,%s) format('woff2');}" % (FAMILLES[slug], g, b64)
            )
    return "\n".join(regles)


def traiter(chemin: Path) -> None:
    html = chemin.read_text(encoding="utf-8")
    tokens = (RACINE / "src" / "styles" / "tokens.css").read_text(encoding="utf-8")
    html = re.sub(
        r"/\*@tokens:debut\*/.*?/\*@tokens:fin\*/",
        lambda m: "/*@tokens:debut*/\n" + tokens + "\n/*@tokens:fin*/",
        html,
        flags=re.S,
    )
    html = re.sub(
        r"/\*@polices:debut ([^*]*)\*/.*?/\*@polices:fin\*/",
        lambda m: "/*@polices:debut " + m.group(1) + "*/\n" + font_faces(m.group(1)) + "\n/*@polices:fin*/",
        html,
        flags=re.S,
    )
    chemin.write_text(html, encoding="utf-8", newline="\n")
    print(f"{chemin.name} : {len(html.encode('utf-8')) / 1024:.0f} Ko")


if __name__ == "__main__":
    for a in sys.argv[1:]:
        traiter(Path(a))
