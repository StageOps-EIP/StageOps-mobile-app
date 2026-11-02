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
