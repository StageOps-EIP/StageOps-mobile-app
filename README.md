# StageOps Mobile App

Application terrain destinée aux techniciens lumière, son et plateau.

Conçue pour fonctionner en environnement réel avec connectivité intermittente.

## Fonctionnalités

- Authentification utilisateur
- Consultation du matériel
- Déclaration d’incident
- Scan QR Code inventaire
- Synchronisation Offline-First
- Visualisation technique simplifiée

## Architecture

src/
  screens/
  components/
  modules/
    equipment/
    incidents/
    scan/
  services/
  storage/
  sync-engine/

## Synchronisation Offline-First

Le moteur de synchronisation permet :

- travail hors connexion
- synchronisation automatique
- résolution de conflits
- stockage local

Technologies possibles :
- PouchDB
- WatermelonDB

## Stack technique

- React Native ou Flutter
- API StageOps
- Architecture mobile modulaire

## Installation

git clone <repo>
cd stageops-mobile-app
npm install

Configurer l’URL API.

### Lancement

npm start

## Objectif produit

Permettre aux techniciens de travailler efficacement sur le terrain.

## Licence

Projet académique.
