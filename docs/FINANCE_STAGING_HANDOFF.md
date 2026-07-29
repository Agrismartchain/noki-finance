# Finance staging handoff

## Etat valide

| Element | Valeur |
| --- | --- |
| API commit | `ab491688bc87f36e679febcf3276d3f3fd1aeef1` |
| Finance commit de base | `6ebc734541c407e4391063cd45fdc959d98c4935` |
| Contracts | `@agrismartchain/noki-shared-contracts@0.31.0` |
| Design System | `@agrismartchain/noki-design-system@0.2.0` |
| Tests attendus | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e` |
| Playwright | stub local via `e2e/support/stub-api-server.mjs`; real-local opt-in uniquement avec `NOKI_REAL_LOCAL_E2E=1` |
| Docker | `docker build --no-cache -t noki-finance:release-candidate .` |
| Recette reelle | realisee localement seulement apres provisionnement depuis `noki-api`; hors CI standard |

## Artefact attendu

| Champ | Valeur |
| --- | --- |
| Image | `ghcr.io/agrismartchain/noki-finance` a confirmer avant publication GHCR |
| Tag commit | commit Finance publie |
| Tag staging | `staging`, uniquement comme canal humain; le deploiement doit retenir un digest |
| Digest | `TO_BE_FILLED_AFTER_PUBLICATION` |
| Dockerfile | `Dockerfile` |
| Context | `.` |
| Platform | `linux/amd64` |
| Port interne | `3000` |
| Healthcheck | `GET /api/health` |
| User | `1001:1001` |

## Variables runtime frontend

| Nom | Obligatoire | Secret | Exemple non sensible | Usage |
| --- | --- | --- | --- | --- |
| `NOKI_API_BASE_URL` | oui | non | `https://api-staging.noki-services.com` ou URL interne confirmee | Base URL serveur vers `noki-api`, sans suffixe `/v1` |

Aucune variable secrete n'est requise au build Finance. Les cookies d'authentification sont `httpOnly`, `secure` en production et `sameSite=lax`.

## Variables runtime API a verifier cote orchestration

| Groupe | Variables |
| --- | --- |
| PostgreSQL | `DATABASE_URL` ou secret source equivalent `NOKI_API_DATABASE_URL` |
| Redis | `REDIS_URL` ou secret source equivalent `NOKI_API_REDIS_URL` |
| Auth/JWT | `JWT_SECRET`, `JWT_ACCESS_TOKEN_TTL_SECONDS`, `JWT_REFRESH_TOKEN_TTL_SECONDS`, `JWT_ISSUER`, `JWT_AUDIENCE` |
| CORS/origins | `CORS_ORIGINS`, a aligner sur l'origine publique Finance staging |
| Observabilite | `LOG_LEVEL` |
| Outbox/queues | `BULLMQ_DEFAULT_QUEUE_PREFIX`, `OUTBOX_PUBLISHER_ENABLED`, `OUTBOX_PUBLISHER_INTERVAL_MS` |
| Environnement | `NODE_ENV=production`, `API_PREFIX=v1`, `PORT=3000` |
| OpenFGA optionnel | `OPENFGA_ENABLED`, `OPENFGA_API_URL`, `OPENFGA_STORE_ID`, `OPENFGA_AUTHORIZATION_MODEL_ID`, `OPENFGA_TIMEOUT_MS` |

## URLs et networking staging

| Champ | Valeur |
| --- | --- |
| Service frontend | `TO_BE_CONFIRMED` |
| URL publique frontend | `TO_BE_CONFIRMED` |
| URL API publique observee | `https://api-staging.noki-services.com` |
| URL API interne cible | `TO_BE_CONFIRMED` |
| Reseau Docker/Coolify | `coolify` observe pour le deploiement API existant |
| Origine autorisee API | `TO_BE_CONFIRMED` apres choix de l'URL publique Finance |
| Proxy headers | a conserver via Coolify/Caddy; aucune valeur secrete |

Ne pas utiliser `localhost` dans les variables staging.

## Preconditions

- CI API et Finance vertes.
- Image Finance publiee sur GHCR et digest recupere.
- Acces GHCR confirme pour le repo d'orchestration/deploiement.
- Backup staging verifie avant toute migration API.
- Migrations API deja gerees par le pipeline API/infra existant.
- DNS/proxy Finance staging decides.
- `CORS_ORIGINS` API configure avec l'origine publique Finance staging.
- Cookies emis en production avec `secure=true` et `sameSite=lax`.

## Procedure apres publication

1. Pousser `noki-api` si les commits API locaux sont retenus.
2. Pousser `noki-finance`.
3. Attendre CI verte.
4. Publier l'image Finance sans tag `latest`.
5. Recuperer le digest OCI publie.
6. Ajouter un lock image Finance dans `noki-infra` selon le modele `images/noki-api.lock.json`.
7. Mettre a jour les templates staging avec la reference `repository@sha256:...`.
8. Verifier le backup staging hors workflow, puis fournir son uuid au gate de deploiement.
9. Deployer staging via le mecanisme d'orchestration approuve.
10. Executer les healthchecks et smoke tests.
11. Rollback sur l'ancien digest si une gate echoue.

## Smoke tests

- `GET /api/health` sur Finance.
- Login Finance.
- Session persistante apres refresh.
- Dashboard Finance.
- Lecture d'un module Finance.
- Logout et effacement des cookies.

## Rollback

Revenir au digest Finance precedent dans le lock versionne, rejouer les validations statiques, redeployer l'ancien digest, puis verifier `GET /api/health`, login, dashboard et logout. Si une migration API accompagne le deploiement, la restauration base de donnees reste une decision humaine explicite basee sur le backup pre-deploiement verifie.

## Interdictions

- Aucun secret dans Git.
- Aucun tag `latest` non verrouille.
- Aucun deploiement sans backup staging verifie.
- Aucune migration manuelle non tracee.
- Aucun token npm requis pour construire Finance avec les tarballs vendorises.
