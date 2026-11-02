# CLAUDE.md

Ce fichier fournit le contexte permanent du projet à Claude Code. Il est lu automatiquement au
démarrage de chaque session dans ce repo. Il est **partagé par toute l'équipe mobile** : toute
modification passe par une PR comme le reste du code. Les préférences personnelles de chacun vont
dans `CLAUDE.local.md` (ignoré par git), jamais ici.

> Les mentions **[À valider en équipe]** signalent une règle proposée mais pas encore actée.
> Les retirer une fois la décision prise (et la consigner dans `docs/DECISIONS.md`).

## Le projet

**StageOps** (EIP Epitech) : application mobile pour les techniciens de spectacle (son, lumière,
vidéo, plateau, sécurité, accroche) permettant de gérer l'inventaire du matériel et de déclarer
des incidents **sur le terrain, même sans réseau**.

Principe structurant : **offline-first**. Toute lecture et écriture passe par la base SQLite
locale ; les modifications sont empilées dans `outbox_events` et poussées vers l'API StageOps
quand le réseau revient. L'app doit rester entièrement utilisable hors connexion.

Ce dépôt ne contient **que l'application mobile**. L'API (`/sync/push`, `/sync/pull`) vit dans un
autre dépôt et est développée par une autre partie de l'équipe : le contrat entre les deux est
documenté dans `docs/SYNC-CONTRACT.md`, qui fait foi. Ne jamais modifier le contrat côté client
sans l'avoir fait valider côté backend.

Suivi de l'avancement : GitHub Project **« StageOps Mobile — Roadmap »** (milestones = phases).
Dernier audit complet : `docs/audits/2026-09-etat-avancement.md` (photographie datée, non
maintenue).

## Stack technique

- **Expo SDK 54** + **React Native 0.81** + **React 19**, TypeScript 5.9 en mode `strict`
- **Navigation** : `@react-navigation` 7 (native-stack + bottom-tabs), params entièrement typés
  (`src/app/navigation/types.ts`)
- **Base locale** : `expo-sqlite` brut, sans ORM, mode WAL
- **Réseau** : `fetch` encapsulé dans `src/infra/api/httpClient.ts` (timeout, erreurs typées),
  connectivité via `@react-native-community/netinfo`
- **Identifiants** : UUID v4 via `expo-crypto` (`src/shared/ids.ts`)
- **Qualité** : ESLint 9 (flat config, `eslint-config-expo`) + Prettier, tests Jest +
  `@testing-library/react-native`
- **CI** : GitHub Actions (typecheck, lint, format:check, test)
- Le choix est **tranché** : pas de Flutter, pas de PouchDB/WatermelonDB (cf. `docs/DECISIONS.md`)

Toutes les commandes se lancent depuis `apps/mobile/`.

## Modèle de données local

Le schéma est défini dans `src/infra/db/schema.ts` et documenté dans @docs/SCHEMA.md — le lire
avant toute modification touchant à la base. Points à retenir :

- 4 tables : `equipment`, `incidents`, `outbox_events`, `sync_state` (clé/valeur : version du
  schéma, curseur, dernière sync)
- Timestamps toujours en **INTEGER epoch ms** ; suppression toujours **logique** via `deleted_at`
- Identifiants générés côté client (UUID v4) : une entité créée hors ligne a déjà son id définitif
- Résolution de conflits : **last write wins** sur `updated_at` (dans le `ON CONFLICT DO UPDATE`
  des repos). Pas de fusion. Tout changement de stratégie est une décision d'équipe.
- Les énumérations (`EquipmentStatus`, `IncidentSeverity`...) et les contrats d'API ont une seule
  source de vérité : `src/shared/types.ts`

## Conventions de code

- Toute évolution du schéma SQLite = **une nouvelle version de migration** dans
  `src/infra/db/migrations.ts`. Ne jamais modifier une migration déjà mergée sur `main` : des
  appareils l'ont peut-être déjà appliquée.
- Toute écriture métier locale produit **l'écriture en base + l'événement outbox dans la même
  transaction** : jamais l'un sans l'autre. [À valider en équipe — vérifier l'existant]
- Les données reçues du serveur sont **validées avant d'être écrites** (`src/shared/validation.ts`),
  jamais castées directement (`as unknown as Equipment`).
- Persistance : SQLite pour toute donnée métier. AsyncStorage uniquement pour des réglages
  techniques non sensibles (`device_id`). Tout secret (token d'auth) dans `expo-secure-store`.
- Couleurs, espacements, typographies : uniquement via le thème (`src/shared/theme.ts`), jamais
  une valeur en dur dans un `StyleSheet`. L'app est en thème sombre partout.
- Formatage des dates/durées : uniquement via `src/shared/time.ts`, pas de fonction locale à
  un écran.
- Tout handler asynchrone déclenché par l'utilisateur (bouton, pull-to-refresh) a un `catch`
  qui affiche une erreur visible. Pas de rejet de promesse non traité, pas de `.catch(() => [])`
  qui fait passer une erreur pour un résultat vide.
- Les écrans d'onglets **restent montés** : un état initialisé depuis une prop ou un param de
  navigation (`useState(prop)`) ne se met pas à jour tout seul. Synchroniser explicitement
  (`useEffect` sur la prop, ou `useFocusEffect`) et réinitialiser les formulaires après envoi
  (vécu sur `IncidentForm`).
- Logs : via `src/infra/logging/log.ts` uniquement, jamais `console.*` direct. Pas de données
  sensibles dans les logs.
- Tous les libellés d'interface sont en français ; tout contrôle interactif a un
  `accessibilityLabel`.

## Architecture applicative

Détail complet dans `ARCHITECTURE.md`. Règles à respecter pour tout nouveau code :

- Pipeline strict : écrans (`src/app/`) → use-cases (`src/features/<domaine>/usecases/`) →
  infra (`src/infra/db/repos/`, `src/infra/sync/`, `src/infra/api/`) → SQLite / HTTP.
  **Un écran n'importe jamais `@infra/*` directement**, il passe par un use-case. `shared/` est
  importable par toutes les couches et n'importe rien d'autre.
- `src/features/` est organisé **par domaine métier** (`inventory`, `incidents`, `dashboard`,
  `sync`, `scan`, `auth`...), chacun avec `usecases/` et `ui/`. Un nouveau domaine suit ce gabarit.
- Composants réutilisables sans logique métier : `src/shared/ui/`. Aucun accès aux données dedans.
- Le moteur de sync (`src/infra/sync/syncEngine.ts`) est le seul à appeler `syncApi`. Le reste de
  l'app déclenche une sync uniquement via `maybeSync()` (garde hors ligne + verrou intégrés) ;
  `syncNow()` est réservé au bouton manuel.
- La sync se déclenche : au démarrage de l'app, au retour du réseau, après chaque écriture locale,
  et via le timer de retry (backoff exponentiel). Tout nouveau déclencheur passe par `maybeSync()`.
- Le client HTTP est le seul endroit où sont posés les headers (dont `Authorization`).

## Méthode de travail

- **Une tâche = une issue = une branche = une PR.** Nommage des branches :
  `<type>/<n°issue>-<description-courte>` (ex. `feat/23-scan-qr`, `fix/31-incident-form-reset`).
  Messages de commit au format Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`...).
- **Toute PR est relue par l'autre membre de l'équipe mobile** avant merge (protection de `main`,
  1 approbation requise). La PR référence son issue (`Closes #n`).
- **Toujours passer par le mode plan** pour toute tâche qui touche au schéma SQLite, au moteur de
  sync, au contrat d'API, à l'auth, ou à plus de 2-3 fichiers : proposer le plan, attendre la
  validation, puis exécuter.
- **Définition de « terminé »** : `npm run typecheck`, `npm run lint`, `npm run format:check` et
  `npm test` passent (la CI les rejoue). Toute logique non triviale (sync, outbox, conflits,
  filtres SQL, validation) a au moins un test du cas nominal et du cas d'erreur principal.
- Ce qui touche à l'UI se vérifie aussi **à l'exécution** (Expo Go ou émulateur) : un écran peut
  compiler et linter tout en étant cassé.
- Signaler explicitement toute décision d'architecture non couverte par ce fichier plutôt que de
  trancher seul. Une décision prise est consignée en quelques lignes dans `docs/DECISIONS.md`.
- Toute procédure de plus de 3-4 lignes (commandes exactes, étapes) va dans `docs/RUNBOOK.md`,
  pas ici — ce fichier ne garde que la règle et un renvoi.

## Conventions de documentation

- Une doc décrit l'état actuel et les décisions durables, pas le raisonnement qui y a mené.
- Pas de suivi d'avancement (statuts, dates) dans `CLAUDE.md`, `ARCHITECTURE.md` ou le README :
  l'avancement vit uniquement dans le GitHub Project.
- Avant d'ajouter une info, vérifier qu'elle n'existe pas déjà ailleurs.
- Carte des docs : `README.md` (présentation + lancement), `ARCHITECTURE.md` (couches, flux),
  `docs/SCHEMA.md` (base locale), `docs/SYNC-CONTRACT.md` (contrat avec l'API),
  `docs/DECISIONS.md` (décisions et écarts), `docs/RUNBOOK.md` (procédures), `docs/ROADMAP.md` (organisation).

## Hors périmètre pour l'instant

- Le backend : il est dans un autre dépôt. Ici, uniquement un serveur de mock pour le
  développement et les tests.
- « Visualisation technique simplifiée » (plans de scène, patch) [À valider en équipe]
- Notifications push [À valider en équipe]
- Internationalisation : l'app est en français uniquement
- Chiffrement de la base locale (SQLCipher) : à réévaluer quand la sensibilité des données de
  production sera connue