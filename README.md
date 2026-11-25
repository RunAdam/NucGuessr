# NucGuessr ☢️

Jeu par navigateur : reconnaître une centrale nucléaire française (puis, plus tard, d'autres sites nucléaires) à partir d'une photo.

- **Rapidité** *(mode par défaut)* : 8 rounds, 20 secondes pour taper le nom du site.
- **Distance** : 5 rounds, placer le site sur la carte de France.

Projet étudiant (promo d'ingénierie nucléaire, ENSTA), sans lien avec EDF, Orano, le CEA ou l'ASNR.

## Règles du jeu

### Pour les deux modes

- Les photos montrent l'une des **18 centrales nucléaires en exploitation** en France (l'EPR Flamanville 3 compte comme le site de Flamanville).
- Dans une partie, **une centrale n'apparaît jamais deux fois**.
- D'une partie à l'autre, le jeu retient (dans votre navigateur) les photos déjà vues : pour chaque centrale, il vous montre en priorité la photo que vous n'avez pas vue depuis le plus longtemps. Toutes les centrales sortent aussi souvent les unes que les autres.
- **Écran de fin de partie :** votre score total (et votre meilleur score), puis le récapitulatif round par round : la photo, la bonne réponse, ce que vous avez répondu, votre temps et vos erreurs (Rapidité) ou votre distance (Distance), et les points gagnés. Chaque centrale a sa fiche courte : nom, réacteurs, source froide et une anecdote.

### Mode Rapidité *(par défaut)* — 8 rounds, 20 secondes chacun

1. Une photo s'affiche : le chronomètre de **20 s** démarre.
2. Tapez le nom de la centrale ; l'autocomplétion vous aide (`Nogen` + `Tab` → Nogent-sur-Seine). Validez avec `Entrée`.
3. **Mauvaise réponse :** le champ vibre, vous perdez **2 secondes**, et vous pouvez réessayer autant de fois que vous voulez tant qu'il reste du temps.
4. **Temps écoulé :** le round est perdu (0 point) et la bonne réponse s'affiche.
5. Entre deux rounds, la réponse reste affichée **1,5 s** (3 s si le round est perdu). `Entrée` ou un tap passe directement au round suivant.

**Score d'un round :**

```
score = 100 + 900 × temps restant / 20 s
```

Autrement dit : **100 points pour la bonne réponse, plus 45 points par seconde restante**. Une erreur coûte 2 s, donc 90 points. Maximum : 1 000 points par round, 8 000 par partie.

> *Exemple :* vous reconnaissez Tricastin, mais tapez d'abord Cruas (−2 s), puis Tricastin, validé 6 s après l'apparition de la photo. Il restait 20 − 6 − 2 = 12 s : 100 + 45 × 12 = **640 points**. Sans l'erreur, c'était 730.

Essayer tous les noms au hasard ne paie pas : avec −2 s par erreur, cela rapporte en moyenne moins qu'une bonne réponse trouvée en réfléchissant pendant 18 secondes.

### Mode Distance — 5 rounds, pas de limite de temps

1. Une photo s'affiche, avec une carte de France où les centrales ne sont pas indiquées.
2. Zoomez, déplacez la carte, puis cliquez (ou touchez) là où se trouve la centrale. Vous pouvez déplacer votre repère autant que vous voulez.
3. **Validez** (bouton ou `Entrée`) : une seule proposition par round. La vraie position, la distance et votre score s'affichent.

**Score d'un round :**

```
score = 5000                                si d ≤ 5 km
score = 5000 × exp(−(d − 5 km) / 75 km)     au-delà
```

À moins de 5 km, c'est **dans le mille** : 5 000 points. Au-delà, le score est **divisé par deux environ tous les 52 km** d'écart supplémentaires. Maximum : 25 000 points par partie.

| Distance | 5 km | 10 km | 35 km | 70 km | 120 km | 300 km |
|---|---|---|---|---|---|---|
| Points | 5 000 | 4 678 | 3 352 | 2 102 | 1 079 | 98 |

> *Exemple :* la photo montre Cruas, vous placez Tricastin, 34 km plus au sud sur le Rhône : **3 408 points**. Bon fleuve, mauvais site : ça coûte cher, mais pas tout.

## État du projet

🚧 En conception : voir la [feuille de route](ROADMAP.md).
