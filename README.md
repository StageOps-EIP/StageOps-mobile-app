# StageOps Mobile App

Application client permettant aux régisseurs de superviser les opérations techniques d’un projet en temps réel.

## Objectif

Fournir une interface simple et rapide pour :

- consulter l’état du matériel
- déclarer des incidents
- visualiser un projet technique
- accéder aux modules selon le rôle utilisateur

## Fonctionnalités MVP

- Authentification utilisateur
- Dashboard projet
- Vue matériel lumière
- Vue matériel son
- Signalement incident
- Interface adaptée terrain

## Architecture

src/
  screens/
  components/
  services/
  modules/
    lighting/
    sound/
    incidents/
  navigation/

## Stack technique

- React Native / Flutter (selon implémentation)
- API REST StageOps
- Architecture modulaire
- UI orientée usage terrain

## Installation

### Prérequis
- Node.js
- Expo CLI ou environnement mobile
- API StageOps en fonctionnement

### Setup

git clone <repo>
cd StageOps-mobile-app
npm install

Configurer l’URL API dans :

src/config/api.ts

### Lancement

npm start

## Philosophie UI

- utilisation rapide
- lisibilité en conditions techniques
- navigation minimale
- tolérance aux erreurs réseau

## Objectif produit

Permettre à un régisseur de gérer un projet technique depuis un smartphone.
