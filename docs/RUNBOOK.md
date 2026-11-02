# Runbook

Procédures opérationnelles du projet. Toutes les commandes se lancent depuis `apps/mobile/`,
jamais à la racine du dépôt.

## Lancer l'app sur un téléphone avec Expo Go

1. Installer l'application Expo Go sur le téléphone.
2. Depuis `apps/mobile/`, démarrer Metro :

   ```bash
   npx expo start
   ```

   Après un changement de dépendances, vider le cache : `npx expo start -c`.

3. Scanner le QR code affiché dans le terminal (appareil photo sur iOS, application Expo Go
   sur Android).

### Version du SDK

Le SDK Expo du projet (version de `expo` dans `apps/mobile/package.json`) doit correspondre au
SDK supporté par l'application Expo Go installée sur le téléphone. En cas de décalage, le scan
du QR code n'ouvre pas l'app.

Pour aligner le projet sur le SDK `<N>` supporté par Expo Go :

```bash
npm install expo@^<N>.0.0
npx expo install --fix
npx expo-doctor
```

`npx expo install --fix` aligne React, React Native et les modules Expo sur le SDK installé ;
`npx expo-doctor` doit passer sans erreur. Vérifier ensuite `npm run typecheck` et
`npm run lint`, puis relancer avec `npx expo start -c`.

### Dépannage

- Le téléphone et le PC doivent être sur le même réseau Wi-Fi.
- Sous Fedora, le pare-feu (firewalld) peut bloquer le port de Metro. Pour tester, ouvrir le
  port pour la session en cours :

  ```bash
  sudo firewall-cmd --add-port=8081/tcp
  ```

- En dernier recours, passer par un tunnel : `npx expo start --tunnel`.

## Ajouter une migration SQLite

Règles du prototype SQLite, à remplacer lors de la migration vers PouchDB (cf. `docs/DECISIONS.md`).

1. Dans `src/infra/db/schema.ts`, déclarer les instructions SQL de la nouvelle version dans un
   tableau `MIGRATION_V<N>: string[]`, et passer `SCHEMA_VERSION` à `<N>` : c'est la version
   cible.
2. Dans `src/infra/db/migrations.ts`, écrire `applyMigrationV<N>()` sur le modèle de
   `applyMigrationV1()` (instructions exécutées dans une transaction exclusive, puis
   `setStoredVersion(<N>)`), et l'appeler dans `migrate()` à la suite des versions existantes :

   ```ts
   if (current < <N>) await applyMigrationV<N>();
   ```

3. Relancer l'app. `migrate()` s'exécute à chaque démarrage (`AppProviders`) et compare la
   version stockée dans `sync_state` (clé `schema_version`, 0 si absente) à `SCHEMA_VERSION`.
   Logs attendus dans le terminal Metro :

   ```text
   [INFO][Migrations] Schema: current=<N-1>, target=<N>
   [INFO][Migrations] Migration complete. Schema is now V<N>
   ```

   Aux lancements suivants : `[INFO][Migrations] Schema is up to date`.
4. Mettre à jour `docs/SCHEMA.md`.

Ne jamais modifier une migration déjà mergée sur `main` : des appareils l'ont peut-être déjà
appliquée. Toute évolution passe par une nouvelle version.

## Réinitialiser la base locale sur un téléphone

L'app n'expose aucun bouton de réinitialisation (`resetDb()` existe dans
`src/infra/db/seed.ts` mais n'est appelé nulle part). Avec Expo Go, il faut effacer les données
d'Expo Go elle-même :

- **Android** : Paramètres → Applications → Expo Go → Stockage → Vider les données.
- **iOS** : désinstaller puis réinstaller Expo Go.

Au relancement, la base est recréée, toutes les migrations sont rejouées depuis la version 0,
puis `seedIfEmpty()` réinsère les données de démo. Les événements outbox non synchronisés et le
`device_id` sont perdus.

## Cycle de vie d'une branche

1. Partir de `main` à jour :

   ```bash
   git switch main && git pull
   git switch -c <type>/<n°issue>-<description>
   ```

2. Mettre à jour une branche partagée avec `git merge main`, jamais `rebase`.
3. Après le merge de la PR, supprimer la branche :

   ```bash
   git switch main && git pull
   git branch -d <type>/<n°issue>-<description>
   git fetch --prune
   ```

## Vérifications avant d'ouvrir une PR

Depuis `apps/mobile/` :

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
```

La CI GitHub Actions rejoue ces quatre vérifications sur chaque PR.
