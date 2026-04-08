# Nitro Ranges

Outil de decision preflop poker. Selectionne une situation, saisis ta main, obtiens l'action recommandee.

## Stack technique

- Nuxt 4 + Vue 3
- TypeScript
- Nuxt UI v4
- Tailwind CSS v4

## Installation

```bash
pnpm install
```

## Lancement

```bash
pnpm dev
```

L'app est accessible sur `http://localhost:3000`.

## Utilisation

1. **Selectionne la situation** : stack effectif (BB), position, spot
2. **Saisis ta main** : ex. `A5s`, `KTo`, `77`
3. **Clique "Voir la decision"** : l'action recommandee s'affiche

## Remplacer les ranges

Edite le fichier `app/data/ranges.json`. Chaque entree a ce format :

```json
{
  "stack_bb": 10,
  "position": "BTN",
  "spot": "BTN first-in",
  "action": "Open shove",
  "hands": "22+, A2s+, A2o+, K5s+...",
  "notes": ""
}
```

### Valeurs possibles

- **stack_bb** : `15`, `10`, `7`
- **position** : `BTN`, `SB`, `BB`
- **spot** : `BTN first-in`, `SB first-in`, `SB vs BTN open`, `SB vs BTN shove`, `BB vs BTN open`, `BB vs shove`

### Notations de ranges supportees

| Notation | Signification |
|----------|--------------|
| `77` | Paire exacte |
| `22+` | Toutes les paires de 22 a AA |
| `22-55` | Paires de 22 a 55 |
| `A5s` | Main suited exacte |
| `A2s+` | Toutes les suited As de A2s a AKs |
| `K9o-KJo` | Offsuit de K9o a KJo |
| `KTo+` | Toutes les offsuit Roi de KTo a KQo |

Les mains sont separees par des virgules : `22+, A2s+, KTo+`

### Regle de priorite

Si une main appartient a plusieurs ranges pour un meme spot, la priorite est :

1. **shove** (plus haute)
2. **3-bet jam**
3. **call**
4. **raise**
5. **fold** (plus basse)

## Structure du projet

```
app/
  pages/index.vue              # Page principale
  components/
    SituationSelector.vue      # 3 dropdowns (stack, position, spot)
    HandInput.vue              # Input main avec validation
    ResultCard.vue             # Affichage du resultat
  types/range.ts               # Types TypeScript
  repositories/ranges.ts       # Chargement et filtrage des donnees
  composables/useRanges.ts     # Logique metier
  utils/rangeParser.ts         # Parser de ranges poker
  data/ranges.json             # Donnees des ranges
```
