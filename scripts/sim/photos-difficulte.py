"""Phase 2 — Difficulté par photo : effet d'un filtre en mode Rapidité sur la rotation par site (phase 0).
Banque : 18 sites, 3 à 5 photos (72 au total) ou 3 par site (54). Difficulté 1 facile / 2 moyenne / 3 difficile.
Joueur : 30 parties d'affilée, 70 % en Rapidité, 30 % en Distance, historique commun aux deux modes."""
import random, statistics as st
random.seed(1234)
def banque(par_site, profil_diff):
    photos = []
    for s, n in enumerate(par_site):
        for k, d in enumerate(profil_diff(n)):
            photos.append((len(photos), s, d))
    return photos
def diff_realiste(n):  # vue d'ensemble facile, aérienne moyenne, détail difficile
    base = {3: [1, 2, 3], 4: [1, 1, 2, 3], 5: [1, 1, 2, 2, 3]}[n]
    return base
def diff_pessimiste(n):  # une seule photo facile par site
    return [1] + [2] * (n - 2) + [3]
P_PERDU = {1: 0.15, 2: 0.30, 3: 0.60}  # hypothèse, joueur moyen en Rapidité
def tirer(photos, histo, rounds, filtre):
    sites = random.sample(range(18), rounds); choix = []
    for s in sites:
        ph = [p for p in photos if p[1] == s]
        ok = [p for p in ph if filtre(p)] or ph
        age = lambda p: histo.get(p[0], -1e9)
        m = min(age(p) for p in ok)
        choix.append(random.choice([p for p in ok if age(p) == m]))
    return choix
OPTIONS = {
    "A aucune (difficulté ignorée par le tirage)": lambda mode: (lambda p: True),
    "B Rapidité : faciles seulement": lambda mode: (lambda p: p[2] == 1) if mode == "R" else (lambda p: True),
    "C Rapidité : sans les difficiles": lambda mode: (lambda p: p[2] <= 2) if mode == "R" else (lambda p: True),
}
for nom_b, par_site, prof in (("72 photos (3-5/site), réaliste", [3,3,3,3,4,4,4,4,4,4,4,4,4,4,5,5,5,5], diff_realiste),
                              ("54 photos (3/site)", [3]*18, diff_realiste),
                              ("72 photos, 1 seule facile/site", [3,3,3,3,4,4,4,4,4,4,4,4,4,4,5,5,5,5], diff_pessimiste)):
    photos = banque(par_site, prof)
    print(f"--- {nom_b} : {sum(1 for p in photos if p[2]==1)} faciles, {sum(1 for p in photos if p[2]==2)} moyennes, {sum(1 for p in photos if p[2]==3)} difficiles")
    for nom, opt in OPTIONS.items():
        prec1 = prec3 = n = 0; perdus = []; dist_diff = []
        for serie in range(1000):
            histo = {}
            for partie in range(30):
                mode = "R" if random.random() < 0.7 else "D"
                rounds = 8 if mode == "R" else 5
                choix = tirer(photos, histo, rounds, opt(mode))
                if mode == "R" and partie >= 3:
                    for p in choix:
                        n += 1; v = histo.get(p[0])
                        prec1 += v is not None and partie - v == 1
                        prec3 += v is not None and partie - v <= 3
                        perdus.append(P_PERDU[p[2]])
                if mode == "D": dist_diff += [p[2] == 3 for p in choix]
                for p in choix: histo[p[0]] = partie
        print(f"{nom:45} Rapidité : revue partie préc. {100*prec1/n:4.1f} %, 3 préc. {100*prec3/n:4.1f} %, rounds perdus attendus {100*st.mean(perdus):4.1f} % | Distance : {100*st.mean(dist_diff):4.1f} % de difficiles")
