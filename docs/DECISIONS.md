# Décisions

Registre des décisions durables de l'application mobile. Une entrée par décision : titre, date,
décision, raison. Une décision qui change ne s'efface pas : on ajoute une nouvelle entrée qui la
remplace. Les procédures associées vivent dans `docs/RUNBOOK.md`.

## Expo et React Native plutôt que Flutter

- **Date** : 2026-03-06
- **Décision** : l'application est développée avec Expo et React Native, en TypeScript.
- **Raison** : un seul écosystème JavaScript/TypeScript et un test immédiat sur téléphone via
  Expo Go.

## Stockage local actuel : SQLite et outbox (prototype du MVP)

- **Date** : 2026-03-06
- **Décision** : le prototype du MVP stocke ses données dans SQLite (`expo-sqlite`, sans ORM) et
  empile ses modifications dans une table `outbox_events` poussée vers l'API au retour du réseau.
  Ce stockage est appelé à être remplacé (voir l'entrée suivante).
- **Raison** : rendre l'app utilisable hors ligne dès le MVP, avec un mécanisme simple et maîtrisé.

## Cible : PouchDB sur le mobile, répliqué avec CouchDB côté serveur

- **Date** : 2026-10-15
- **Décision** : le stockage local cible est PouchDB, répliqué avec CouchDB côté serveur. Décision
  prise au niveau du projet (ADR-0001 du backend) ; le plan de migration est décrit dans le wiki :
  [Migration PouchDB / CouchDB](https://github.com/StageOps-EIP/StageOps/wiki/Migration-PouchDB-CouchDB).
- **Raison** : s'aligner sur la technologie de synchronisation retenue par le backend.

## Résolution des conflits : « last write wins » sur `updated_at`

- **Date** : 2026-03-06
- **Décision** : dans le prototype, en cas de conflit, la version dont l'`updated_at` est le plus
  récent l'emporte, sans fusion. Après la migration vers PouchDB, les conflits passeront par le
  mécanisme de révisions de CouchDB/PouchDB.
- **Raison** : règle simple et déterministe, suffisante pour le MVP.

## Version du SDK Expo alignée sur Expo Go

- **Date** : 2026-11-02
- **Décision** : la version du SDK Expo du projet suit celle supportée par l'application Expo Go
  (PR #10 ; procédure d'alignement dans `docs/RUNBOOK.md`).
- **Raison** : sans cet alignement, l'app ne s'ouvre pas dans Expo Go sur nos téléphones.

## Réinitialisation de `main` sur la version de référence

- **Date** : 2026-10-01
- **Décision** : `main` a été réinitialisée sur la version locale de référence de l'application ;
  l'ancien contenu est conservé dans la branche `backup/main-avant-reset`.
- **Raison** : repartir d'une base saine et connue, sans perdre l'historique précédent.

## Organisation en phases et GitHub Project dédié au mobile

- **Date** : 2026-10-01
- **Décision** : le travail est organisé en phases planifiées une à une, suivies dans un GitHub
  Project dédié au mobile, séparé du project global de l'organisation (cf. `docs/ROADMAP.md`).
- **Raison** : ne planifier que ce qui est connu et suivre le mobile sans bruit des autres équipes.

## `git merge` plutôt que `rebase` sur une branche partagée

- **Date** : 2026-11-02
- **Décision** : une branche partagée se met à jour avec `git merge main`, jamais avec `rebase`.
- **Raison** : ne pas réécrire un historique déjà poussé sur lequel l'autre membre travaille.
