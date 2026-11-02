# Schéma des données — StageOps Mobile

Ce document décrit la base locale de l'application, en deux parties :

- **Base actuelle** : le prototype SQLite, à remplacer lors de la migration vers PouchDB
  (cf. [`DECISIONS.md`](DECISIONS.md)).
- **Modèle cible** : les fiches PouchDB, répliquées avec CouchDB côté serveur.

L'organisation du code et des deux architectures est décrite dans
[`ARCHITECTURE.md`](ARCHITECTURE.md).

## Base actuelle (prototype SQLite)

Le schéma est défini dans `apps/mobile/src/infra/db/schema.ts`. Version actuelle : **1**
(`SCHEMA_VERSION`). La version appliquée sur le téléphone est stockée dans `sync_state` (clé
`schema_version`) ; `migrate()` (`src/infra/db/migrations.ts`) applique les versions manquantes
à chaque démarrage. Pour ajouter une version : [`RUNBOOK.md`](RUNBOOK.md#ajouter-une-migration-sqlite).

Conventions :

- Dates en `INTEGER`, en millisecondes depuis le 1er janvier 1970 (epoch ms).
- Suppression logique : une ligne supprimée garde ses données et reçoit une date dans
  `deleted_at`.
- Identifiants générés sur le téléphone (UUID v4) : une fiche créée hors ligne a déjà son
  identifiant définitif.
- Les valeurs possibles des colonnes textuelles (états, gravités…) ont une seule source de
  vérité : `src/shared/types.ts`. Elles sont rappelées ci-dessous.

### `equipment` — l'inventaire du matériel

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | TEXT | clé primaire | Identifiant de l'équipement. |
| `name` | TEXT | obligatoire | Nom de l'équipement. |
| `category` | TEXT | obligatoire | `SON`, `LUMIERE`, `VIDEO`, `PLATEAU`, `SECURITE` ou `ACCROCHE`. |
| `qr_code` | TEXT | obligatoire, unique | Code du QR code collé sur l'équipement. |
| `location` | TEXT | obligatoire | Emplacement. |
| `status` | TEXT | obligatoire, défaut `OK` | `OK`, `A_VERIFIER`, `HS` ou `EN_REPARATION`. |
| `responsible_name` | TEXT | | Personne responsable. |
| `last_check_at` | INTEGER | | Date de la dernière vérification. |
| `notes` | TEXT | | Remarques libres. |
| `updated_at` | INTEGER | obligatoire | Date de dernière modification. |
| `deleted_at` | INTEGER | | Date de suppression logique. |

### `incidents` — les incidents déclarés

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `id` | TEXT | clé primaire | Identifiant de l'incident. |
| `equipment_id` | TEXT | | Équipement concerné (facultatif, sans clé étrangère). |
| `title` | TEXT | obligatoire | Résumé du problème. |
| `severity` | TEXT | obligatoire, défaut `FAIBLE` | `FAIBLE`, `MOYENNE` ou `ELEVEE`. |
| `status` | TEXT | obligatoire, défaut `OPEN` | `OPEN`, `IN_PROGRESS` ou `RESOLVED`. |
| `description` | TEXT | | Détail du problème. |
| `created_by` | TEXT | | Auteur (identifiant de l'appareil). |
| `created_at` | INTEGER | obligatoire | Date de création. |
| `updated_at` | INTEGER | obligatoire | Date de dernière modification. |
| `deleted_at` | INTEGER | | Date de suppression logique. |

### `outbox_events` — les modifications en attente d'envoi

Chaque modification locale y ajoute un événement, envoyé au serveur à la synchronisation.

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `event_id` | TEXT | clé primaire | Identifiant de l'événement. |
| `device_id` | TEXT | obligatoire | Appareil qui a produit l'événement. |
| `type` | TEXT | obligatoire | `EQUIPMENT_UPDATE_STATUS`, `EQUIPMENT_UPDATE`, `INCIDENT_CREATE` ou `INCIDENT_UPDATE`. |
| `payload_json` | TEXT | obligatoire | Contenu de la modification, en JSON. |
| `created_at` | INTEGER | obligatoire | Date de création de l'événement. |
| `status` | TEXT | obligatoire, défaut `PENDING` | `PENDING`, `SENT` ou `FAILED`. |
| `last_error` | TEXT | | Dernière erreur d'envoi. |
| `attempt_count` | INTEGER | obligatoire, défaut `0` | Nombre de tentatives d'envoi. |

### `sync_state` — informations techniques (clé / valeur)

| Colonne | Type | Contraintes | Description |
|---|---|---|---|
| `key` | TEXT | clé primaire | Nom de l'information. |
| `value` | TEXT | obligatoire | Valeur, stockée en texte. |
| `updated_at` | INTEGER | obligatoire | Date de dernière modification. |

Clés utilisées : `schema_version` (version du schéma appliquée), `cursor` (position de la
dernière récupération des changements du serveur), `last_sync_at` (date de la dernière
synchronisation réussie).

### Index

| Index | Table | Colonnes |
|---|---|---|
| `idx_equipment_status` | `equipment` | `status` |
| `idx_equipment_category` | `equipment` | `category` |
| `idx_equipment_updated` | `equipment` | `updated_at` |
| `idx_incidents_status` | `incidents` | `status` |
| `idx_incidents_equipment` | `incidents` | `equipment_id` |
| `idx_outbox_status` | `outbox_events` | `status`, `created_at` |

## Modèle cible (PouchDB / CouchDB)

### Comment sont rangées les données

L'application stocke ses données dans **PouchDB** sur le téléphone, synchronisé avec **CouchDB**
sur le serveur. Ces bases n'ont pas de tables comme une base classique : chaque élément (un
projet, un équipement, un incident…) est une **fiche** indépendante, appelée « document ». Les
fiches d'un même type jouent le rôle d'une table.

Les données sont celles du serveur : ce document reprend les champs définis par le backend, avec
leur nom technique entre parenthèses quand il est utile aux développeurs.

#### Ce que toutes les fiches ont en commun

| Champ | Description |
|---|---|
| Identifiant (`_id`) | Code unique de la fiche. |
| Version (`_rev`) | Numéro de version géré par CouchDB. Il change à chaque modification et sert à la synchronisation et à la détection des conflits. |
| Type (`type`) | Le type de fiche : projet, matériel, incident… C'est ce qui remplace le nom de la table. |
| Théâtre (`theatre_id`) | Le théâtre auquel appartient la fiche. Un téléphone ne reçoit que les fiches de son théâtre. |

### Vue d'ensemble

```mermaid
erDiagram
    THEATRE ||--|{ MODULE : "active"
    THEATRE ||--o{ PROJET : "contient"
    THEATRE ||--o{ EVENEMENT : "organise"
    THEATRE ||--o{ MEMBRE_EQUIPE : "emploie"
    PROJET ||--o{ MATERIEL : "utilise"
    PROJET ||--o{ INCIDENT : "suit"
    MATERIEL |o--o{ INCIDENT : "concerne"
    EVENEMENT }o--o{ MATERIEL : "mobilise"
    EVENEMENT }o--o{ MEMBRE_EQUIPE : "mobilise"
```

À lire ainsi : un théâtre contient des projets ; un projet utilise du matériel et suit des
incidents ; un incident peut concerner un équipement. Les événements dépendent du théâtre, pas
d'un projet, et peuvent mobiliser du matériel et des membres de l'équipe.

### Les types de fiches

#### Module

> **À quoi ça sert** : les modules sont les trois métiers du théâtre : lumière, son et plateau.
> Cette fiche indique si un métier est activé pour tout le théâtre. Elle permet à l'application
> de n'afficher que les parties utiles.

| Champ | Description |
|---|---|
| Nom (`name`) | Lumière (`lumiere`), son (`son`) ou plateau (`plateau`). |
| Actif (`active`) | Oui ou non. |
| Dernière modification (`updated_at`) | Date du dernier changement. |

#### Projet

> **À quoi ça sert** : un projet représente une production du théâtre (un spectacle, un
> festival…) sur une période donnée. C'est le point d'entrée de l'application : le technicien
> choisit d'abord son projet, puis travaille sur le matériel et les incidents de ce projet.

| Champ | Description |
|---|---|
| Nom (`name`) | Nom du projet, par exemple « Festival StageOps ». |
| Lieu (`venue`) | Salle ou lieu du projet. |
| Date de début / de fin (`start_date`, `end_date`) | Période du projet, au format année-mois-jour. |
| Modules du projet (`modules_config`) | Lumière, son et/ou plateau activés pour ce projet. Un module désactivé reste consultable, mais on ne peut plus rien y créer ni modifier. |
| Création / dernière modification (`created_at`, `updated_at`) | Dates gérées par le serveur. |

#### Matériel

> **À quoi ça sert** : chaque fiche matériel décrit un équipement utilisé sur un projet (un
> projecteur, une console, une enceinte…). C'est l'inventaire du technicien : il y consulte
> l'état d'un équipement, le met à jour sur le terrain, et retrouve sa fiche en scannant son QR
> code.

| Champ | Description |
|---|---|
| Projet (`project_id`) | Le projet auquel l'équipement est rattaché. |
| Module (`module`) | Lumière (`lighting`), son (`audio`) ou plateau (`stage`). |
| Nom (`name`) | Nom de l'équipement, par exemple « Lyre face jardin ». Le serveur refuse les noms en double. |
| Type d'appareil (`kind`) | Dépend du module, voir le tableau ci-dessous. |
| État (`status`) | OK (`ok`), à vérifier (`to-check`), hors service (`hs`) ou en réparation (`repair`). |
| QR code (`qr_code`) | Code collé sur l'équipement pour ouvrir sa fiche. Facultatif. |
| Emplacement (`location`) et zone (`zone`) | Où se trouve l'équipement. Facultatifs. |
| Responsable (`responsible_person`) | Personne en charge de l'équipement. Facultatif. |
| Dernière vérification (`last_check`) | Date du dernier contrôle. Facultatif. |
| Adressage DMX (`dmx_universe`, `dmx_address`, `dmx_channels`) | Lumière uniquement : univers, adresse de départ et nombre de canaux. Deux équipements d'un même projet ne peuvent pas occuper les mêmes adresses. |
| Notes (`notes`) | Remarques libres. |
| Création / dernière modification (`created_at`, `updated_at`) | Dates gérées par le serveur. |

Types d'appareils possibles selon le module :

| Module | Types |
|---|---|
| Lumière | Lyre (`moving-head`), projecteur fixe (`fixed`), laser (`laser`), autre (`other`) |
| Son | Micro (`microphone`), micro sans fil (`wireless`), console (`console`), enceinte (`speaker`), autre (`other`) |
| Plateau | Décor (`set`), sécurité (`safety`), accroche (`rigging`), autre (`other`) |

Le serveur stocke aussi une position 3D (`position`) ; elle n'est pas utilisée par l'application
mobile.

#### Incident

> **À quoi ça sert** : un incident est un problème signalé sur le terrain (un projecteur qui ne
> répond plus, un câble défectueux…). Il permet de prévenir l'équipe, de suivre le problème
> jusqu'à sa résolution et de garder une trace de ce qui a été fait. C'est la principale donnée
> créée hors ligne par les techniciens.

| Champ | Description |
|---|---|
| Projet (`project_id`) | Le projet concerné. |
| Module (`module`) | Lumière (`lighting`) ou son (`audio`) uniquement. |
| Titre (`title`) | Résumé du problème. |
| Description (`description`) | Détail du problème. |
| Gravité (`severity`) | Faible (`low`), moyenne (`medium`), élevée (`high`) ou critique (`critical`). |
| Statut (`status`) | Ouvert (`open`), en cours (`in-progress`), résolu (`resolved`) ou clos (`closed`). |
| Matériel associé (`equipment_id`) | L'équipement concerné. Facultatif. |
| Signalé par (`reported_by`) | La personne qui a déclaré l'incident. |
| Date de résolution (`resolved_at`) | Quand le problème a été réglé. |
| Notes de résolution (`resolution_notes`) | Ce qui a été fait pour régler le problème. |
| Photos (`images`) | Photos jointes à l'incident. |
| Création / dernière modification (`created_at`, `updated_at`) | Dates gérées par le serveur. |

#### Événement

> **À quoi ça sert** : un événement est un moment de la vie du théâtre (une représentation, un
> concert…) avec ses étapes, du montage au démontage. L'application les affiche pour que le
> technicien sache ce qui est prévu, avec quel matériel et quelle équipe.

| Champ | Description |
|---|---|
| Titre (`title`) | Nom de l'événement. |
| Début / fin (`startDate`, `endDate`) | Date et heure de début et de fin. |
| Lieu (`venue`) et scène (`stage`) | Où se déroule l'événement. |
| Statut (`status`) | En préparation (`planning`), montage (`setup`), en cours (`running`), démontage (`strike`) ou terminé (`completed`). |
| Avancement de la checklist (`checklistProgress`) | Où en est la préparation. |
| Matériel (`equipmentIds`) | Les équipements mobilisés. |
| Équipe (`teamMembers`) | Les membres de l'équipe mobilisés. |

#### Membre d'équipe

> **À quoi ça sert** : une fiche membre d'équipe décrit une personne de l'équipe technique, pour
> savoir qui fait quoi et qui contacter. Ce n'est **pas** un compte : une personne peut avoir une
> fiche sans pouvoir se connecter à l'application.

| Champ | Description |
|---|---|
| Nom (`name`) | Nom de la personne. |
| Rôle (`role`) | Son poste dans l'équipe. |
| Photo (`avatar`) | Facultative. |
| Email (`email`) et téléphone (`phone`) | Pour la contacter. Le téléphone est facultatif. |
| Permissions (`permissions`) | Liste des droits associés à la fiche. |

### Ce qui ne va jamais sur le téléphone

Les **comptes**, les **sessions de connexion**, la liste des **téléphones autorisés** et
l'**historique de sécurité** restent uniquement sur le serveur. Ils ne sont jamais copiés dans la
base du téléphone.

Le téléphone garde seulement, dans son stockage sécurisé, de quoi rester connecté et son
autorisation hors ligne (voir [ARCHITECTURE.md](ARCHITECTURE.md#connexion-et-sécurité)).
