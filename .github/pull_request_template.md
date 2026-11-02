## Ce que fait cette PR

<!-- Une ou deux phrases. -->

Closes #

## Checklist « terminé »

Depuis `apps/mobile/` :

- [ ] `npm run typecheck`, `npm run lint`, `npm run format:check` et `npm test` passent
- [ ] Toute logique non triviale (sync, outbox, conflits, filtres SQL, validation) a au moins un test du cas nominal et du cas d'erreur principal
- [ ] Si l'interface est touchée : testé à l'exécution sur Expo Go
- [ ] Documentation mise à jour si nécessaire
