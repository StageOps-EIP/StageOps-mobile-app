# StageOps Mobile

Application mobile des techniciens de spectacle pour consulter l'inventaire du matériel et
déclarer des incidents sur le terrain. Elle est **offline-first** : tout est lu et écrit dans la
base du téléphone, et synchronisé avec l'API StageOps quand le réseau revient.

Stockage : le prototype du MVP stocke ses données dans SQLite (`expo-sqlite`) avec une table
`outbox_events` ; la cible est PouchDB, répliqué avec CouchDB côté serveur
(cf. [docs/DECISIONS.md](docs/DECISIONS.md)).

## Fonctionnalités

- **Tableau de bord** : chiffres clés de l'inventaire et des incidents, derniers incidents.
- **Inventaire** : liste du matériel avec recherche et filtres (état, catégorie), fiche d'un
  équipement, changement de son état.
- **Incidents** : déclaration d'un incident, éventuellement lié à un équipement.
- **Synchronisation** : état de la synchronisation, file des modifications en attente,
  synchronisation manuelle et relance d'un envoi en échec.

## Stack

| Outil | Version |
|---|---|
| Expo SDK | 58 (`expo` ^58.0.22) |
| React Native | 0.88.1 |
| React | 19.3.0 |
| TypeScript | ~6.0.3 (mode `strict`) |
| expo-sqlite | ~58.0.15 |
| React Navigation | 7 (native-stack, bottom-tabs) |

Qualité : ESLint 9, Prettier, tests avec Jest 30 (preset `jest-expo`) et React Native Testing
Library ; une CI GitHub Actions rejoue typecheck, lint, format:check et tests sur chaque PR.

## Prérequis

- Node.js 22.13 ou plus récent (minimum requis par Expo SDK 58), avec npm. La version de
  référence (celle de la CI) est dans `.nvmrc`, à la racine du dépôt : avec nvm, `nvm install` (une
  fois) puis `nvm use` la sélectionnent, depuis `apps/mobile/` aussi (nvm remonte jusqu'au `.nvmrc`).
- L'application **Expo Go** sur le téléphone, compatible avec le SDK 58.
- Le téléphone et l'ordinateur sur le même réseau Wi-Fi.

## Installation et lancement

> Toutes les commandes se lancent depuis `apps/mobile/`, **jamais à la racine du dépôt**.

```bash
git clone https://github.com/StageOps-EIP/StageOps-mobile-app.git
cd StageOps-mobile-app/apps/mobile
npm install
cp .env.example .env   # puis renseigner EXPO_PUBLIC_API_URL
npx expo start
```

`.env` contient l'URL de l'API StageOps (voir les commentaires de `.env.example`). Il est
ignoré par git ; sans lui, l'app vise `http://localhost:8080`.

Scanner ensuite le QR code affiché dans le terminal : appareil photo sur iOS, application
Expo Go sur Android. Au premier lancement, l'app crée sa base locale et insère des données de
démonstration.

Si le QR code n'ouvre pas l'app (version du SDK, réseau, pare-feu) :
[docs/RUNBOOK.md](docs/RUNBOOK.md#lancer-lapp-sur-un-téléphone-avec-expo-go).

## Scripts disponibles

| Commande | Rôle |
|---|---|
| `npm start` | Démarre Metro (équivalent de `npx expo start`). |
| `npm run android` | Démarre Metro et ouvre l'app sur un appareil ou émulateur Android. |
| `npm run ios` | Démarre Metro et ouvre l'app sur un simulateur iOS (macOS). |
| `npm run typecheck` | Vérifie les types TypeScript. |
| `npm run lint` | Lance ESLint sur `src/` (aucun avertissement toléré). |
| `npm run lint:fix` | Corrige automatiquement ce qu'ESLint peut corriger. |
| `npm run format` | Formate `src/` avec Prettier. |
| `npm run format:check` | Vérifie le formatage de `src/` sans modifier les fichiers. |
| `npm test` | Lance les tests Jest. |

## Structure du dépôt

```text
apps/mobile/
  src/
    app/        écrans et navigation
    features/   logique métier, un dossier par domaine (dashboard, incidents, inventory, sync)
    infra/      base locale, synchronisation, client HTTP, logs
    shared/     types, constantes et outils communs
docs/           documentation du projet
```

Organisation détaillée et règles entre couches : [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Documentation

| Document | Rôle |
|---|---|
| [CLAUDE.md](CLAUDE.md) | Règles et conventions du projet (lu aussi par Claude Code). |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Organisation du code, architecture actuelle et cible. |
| [docs/SCHEMA.md](docs/SCHEMA.md) | Base locale actuelle et modèle de données cible. |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Décisions durables et leurs raisons. |
| [docs/RUNBOOK.md](docs/RUNBOOK.md) | Procédures : lancement, migrations, branches. |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Planification des phases. |

## Contribuer

Une issue = une branche = une PR, relue et approuvée par l'autre membre de l'équipe mobile
avant le merge sur `main`. Branches nommées `<type>/<n°issue>-<description>`, commits au format
Conventional Commits. La CI (`.github/workflows/mobile.yml`) doit être verte. Détail du cycle et
vérifications avant PR : [docs/RUNBOOK.md](docs/RUNBOOK.md#cycle-de-vie-dune-branche).

Suivi des tâches : [GitHub Project « StageOps Mobile — Roadmap »](https://github.com/orgs/StageOps-EIP/projects/3).

## Projet StageOps

Ce dépôt fait partie du projet EIP StageOps, avec
[StageOps-backend](https://github.com/StageOps-EIP/StageOps-backend) (API) et
[StageOps-web-app](https://github.com/StageOps-EIP/StageOps-web-app) (application web).
