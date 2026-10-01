# StageOps Mobile — Roadmap

Ce document est la **référence de planification** de l'application mobile. Claude Code s'appuie
dessus pour créer les milestones, labels et issues du GitHub Project
**« StageOps Mobile — Roadmap »**.

Il ne contient **aucun statut** : l'avancement (à faire, en cours, terminé) vit uniquement dans le
GitHub Project. Ce fichier décrit *ce qu'il faut faire* ; le Project dit *où on en est*.

## Processus

Les phases sont planifiées **une à la fois**, jamais à l'avance :

1. La phase N est écrite ici (objectif + issues + critères de fin).
2. Claude Code crée le milestone et les issues de la phase N dans le GitHub Project.
3. L'équipe réalise les issues (une issue = une branche = une PR relue par l'autre membre).
4. La **dernière issue de chaque phase** est toujours « Préparer la phase N+1 » : analyser l'état
   du projet, décider ensemble du contenu de la phase suivante et l'écrire dans ce document.
5. Retour à l'étape 2 pour la phase N+1.

Une phase terminée reste dans ce document (historique des décisions de découpage).

## Conventions

- **Phase = milestone** GitHub, nommé `Phase N — <Titre>`.
- **Identifiant d'issue** dans ce document : `N.x` (ex. `0.3`). Le numéro GitHub est reporté dans la
  colonne « Issue » une fois l'issue créée — c'est ce qui permet de savoir ce qui a déjà été créé.
- **Titre de l'issue GitHub** = le titre de la ligne, tel quel. Le corps de l'issue reprend le
  critère « Terminé quand » sous forme de checklist.
- **Labels** : toujours un label de phase + au moins un label de type.

| Famille | Labels |
|---|---|
| Phase | `phase:0`, `phase:1`… (créé à l'ouverture de chaque phase) |
| Type | `type:setup` · `type:feature` · `type:bug` · `type:refactor` · `type:test` · `type:ci` · `type:docs` · `type:auth` · `type:sync` · `type:analyse` |
| Blocage | `blocked:backend` (dépend de l'équipe API) |

- **Colonnes (Status)** : `Backlog` → `À faire` → `En cours` → `En revue` → `Terminé`.
- **Taille** : `S` (moins d'une demi-journée), `M` (1 à 2 jours), `L` (plus — à découper si possible).

Contexte de départ : audit du 24/09/2026 (`docs/audits/2026-09-etat-avancement.md`).

---

## Phase 0 — Fondations

**Objectif** : remettre le dépôt d'aplomb pour pouvoir travailler à deux sereinement — pouvoir
lancer l'app sur nos téléphones, avoir un filet de sécurité automatique (tests + CI) et une
documentation qui reflète le projet réel. Aucune nouvelle fonctionnalité dans cette phase.

| ID | Titre | Labels | Taille | Assigné | Terminé quand | Issue |
|---|---|---|---|---|---|---|
| 0.1 | Corriger l'accès à l'app via Expo Go (scan du QR code local) | `type:bug` `type:setup` | M | | Les deux membres de l'équipe ouvrent l'app sur leur téléphone via Expo Go ; la cause (compte Expo, réseau local, mode tunnel…) et la procédure sont documentées dans `docs/RUNBOOK.md` | #1 |
| 0.2 | Protéger `main` et ajouter les templates d'issue et de PR | `type:setup` | S | | Merge sur `main` impossible sans PR approuvée par l'autre membre ; template de PR avec la checklist « terminé » de `CLAUDE.md` | #2 |
| 0.3 | Appliquer Prettier sur tout le code (commit isolé) | `type:setup` | S | | `npm run format:check` passe ; le commit ne contient que du formatage | #3 |
| 0.4 | Configuration d'environnement : `.env.example`, `.gitignore`, version de Node | `type:setup` | S | | `.env` ignoré par git ; `EXPO_PUBLIC_API_URL` documentée dans `.env.example` ; `.nvmrc` + champ `engines` présents | #4 |
| 0.5 | Mettre en place Jest + Testing Library | `type:test` | S | | `npm test` existe et un premier test (`backoffMs`) passe | #5 |
| 0.6 | CI GitHub Actions : typecheck, lint, format:check, test | `type:ci` | S | | CI verte sur une PR et bloquante pour le merge | #6 |
| 0.7 | Réécrire le README | `type:docs` | S | | Stack réelle décrite ; un nouveau venu lance l'app en suivant le README (depuis `apps/mobile`) | #7 |
| 0.8 | Socle de documentation projet | `type:docs` | M | Quentin | `CLAUDE.md`, `ARCHITECTURE.md`, `docs/SCHEMA.md`, `docs/DECISIONS.md`, `docs/RUNBOOK.md` et `docs/ROADMAP.md` mergés et relus par les deux ; audit archivé dans `docs/audits/` | #8 |
| 0.9 | Préparer la phase 1 | `type:analyse` | M | | Phase 1 rédigée dans ce document (objectif + issues + critères), validée par les deux, milestone et issues créés dans le GitHub Project | #9 |