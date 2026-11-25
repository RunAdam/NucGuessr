"""Phase 2 — Temps d'attente du joueur au chargement des photos (mode Rapidité, 8 rounds).
Modèle : téléchargements séquentiels (une photo à la fois), durée = latence + taille / débit.
Profils de joueurs repris de la phase 0 (scripts/sim/durees.mjs)."""
import random, math, statistics as st
random.seed(1234)
RESEAUX = {"4G lente (1,6 Mbit/s, 150 ms)": (1.6e6, 0.15), "3G lente (0,4 Mbit/s, 2 s)": (0.4e6, 2.0)}
PROFILS = {"expert": (0.9, 3), "moyen": (0.6, 5.5), "debutant": (0.25, 8)}
def lognorm(med, s=0.45): return med * math.exp(s * random.gauss(0, 1))
def duree_round(p, med):
    if random.random() < p:
        t = lognorm(med) + 1.2
        if t < 20: return t, 1.5
    return 20.0, 3.0
def partie(reseau, profil, avance, accueil=5.0, kmin=150, kmax=300):
    debit, rtt = RESEAUX[reseau]; p, med = PROFILS[profil]
    tailles = [random.uniform(kmin, kmax) * 1024 * 8 for _ in range(8)]
    dl = [rtt + b / debit for b in tailles]
    # file : la photo i peut commencer à se télécharger quand la photo i-avance est affichée (avance=99 : tout de suite)
    fin_dl = [0.0] * 8; affiche = [0.0] * 8
    t = 0.0  # t = 0 : le joueur arrive sur l'accueil ; la partie est lancée à t = accueil
    libre = 0.0; attente = 0.0
    for i in range(8):
        depart_autorise = 0.0 if (avance >= 99 or i < avance) else affiche[i - avance]
        debut = max(libre, depart_autorise)
        fin_dl[i] = debut + dl[i]; libre = fin_dl[i]
        pret_joueur = accueil if i == 0 else t  # moment où le round i pourrait commencer
        affiche[i] = max(pret_joueur, fin_dl[i]); attente += affiche[i] - pret_joueur
        r, d = duree_round(p, med); t = affiche[i] + r + d
    return attente
for reseau in RESEAUX:
    for avance, nom in ((1, "préchargement du round suivant"), (2, "2 rounds d'avance"), (99, "les 8 photos en file dès l'accueil")):
        ligne = []
        for profil in PROFILS:
            a = [partie(reseau, profil, avance) for _ in range(5000)]
            ligne.append(f"{profil} {st.mean(a):4.1f} s")
        print(f"{reseau:30} {nom:38}", " | ".join(ligne))
# LQIP : 2 Ko, 400 px flouée, téléchargée avant la vraie : temps pendant lequel le joueur voit l'image floue avant le chrono
print("Attente par photo seule (Ko -> s) :")
for reseau, (debit, rtt) in RESEAUX.items():
    print(reseau, {k: round(rtt + k * 1024 * 8 / debit, 1) for k in (2, 150, 300)})
