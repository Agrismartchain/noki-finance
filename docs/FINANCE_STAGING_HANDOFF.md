# Finance staging handoff

## Etat valide

| Element | Valeur |
| --- | --- |
| API commit | `ab491688bc87f36e679febcf3276d3f3fd1aeef1` |
| Finance commit image publiee | `811b0e23aa6c2980ee7e86a215e55c0fca78f7b6` |
| Contracts | `@agrismartchain/noki-shared-contracts@0.31.0` |
| Design System | `@agrismartchain/noki-design-system@0.2.0` |
| Tests attendus | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e` |
| Playwright | stub local via `e2e/support/stub-api-server.mjs`; real-local opt-in uniquement avec `NOKI_REAL_LOCAL_E2E=1` |
| Docker | `docker build --no-cache -t noki-finance:release-candidate .` |
| Recette reelle | realisee localement seulement apres provisionnement depuis `noki-api`; hors CI standard |
| CI API | `https://github.com/Agrismartchain/noki-api/actions/runs/30450541363` |
| CI Finance source image | `https://github.com/Agrismartchain/noki-finance/actions/runs/30453519817` |
| Publication GHCR Finance | `https://github.com/Agrismartchain/noki-finance/actions/runs/30453858932` |
| Lock infra Finance | `noki-infra/images/noki-finance.lock.json` au commit `cbedb8cde0c7e675e058838b4e71cf08664d493a` |

## Artefact attendu

| Champ | Valeur |
| --- | --- |
| Image | `ghcr.io/agrismartchain/noki-finance` |
| Tag commit | `811b0e23aa6c2980ee7e86a215e55c0fca78f7b6` |
| Tag staging | non cree ; aucun alias mutable `staging` ou `latest` |
| Digest | `sha256:37ef8b70a7db9e782cc7e85e247649db6b9847f50c21f208e3dcae28e438951e` |
| Reference immutable | `ghcr.io/agrismartchain/noki-finance@sha256:37ef8b70a7db9e782cc7e85e247649db6b9847f50c21f208e3dcae28e438951e` |
| Visibilite package GHCR | `public` |
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
| `STAGING_PUBLIC_URL` | `TO_BE_CONFIRMED` |
| URL API publique observee | `https://api-staging.noki-services.com` |
| `STAGING_INTERNAL_API_URL` | `TO_BE_CONFIRMED` |
| Reseau Docker/Coolify | non modifie pendant cette phase |
| Origine autorisee API | `TO_BE_CONFIRMED` apres choix de l'URL publique Finance |
| Proxy headers | a conserver via Coolify/Caddy; aucune valeur secrete |

Ne pas utiliser `localhost` dans les variables staging.

## Realise dans cette phase

- `noki-api` publie et CI distante verte sur `main`.
- `noki-finance` publie et CI distante verte sur `main`.
- Image Finance publiee sur GHCR sans tag `latest`, sans alias `staging`, avec tag SHA complet et digest OCI.
- Package GHCR Finance verifie en visibilite `public`.
- Lock Finance ajoute dans `noki-infra/images/noki-finance.lock.json`.
- Validateur `scripts/validate-finance-image-lock.py` ajoute et execute dans la CI infra.
- CI infra et smoke des images publiees verts apres ajout du lock.
- Aucun deploiement staging/production, aucune connexion Coolify, aucune commande SSH, aucune modification DNS et aucune migration.

## Preconditions

- CI API et Finance vertes.
- Image Finance publiee sur GHCR et digest recupere.
- Acces GHCR confirme pour le repo d'orchestration/deploiement.
- Backup staging verifie avant toute migration API.
- Migrations API deja gerees par le pipeline API/infra existant.
- DNS/proxy Finance staging decides.
- `CORS_ORIGINS` API configure avec l'origine publique Finance staging.
- Cookies emis en production avec `secure=true` et `sameSite=lax`.

## Procedure restante apres publication

1. Decider l'URL publique Finance staging, l'URL API interne cible, le routage et le reseau d'orchestration.
2. Configurer `CORS_ORIGINS` API avec l'origine publique Finance retenue.
3. Raccorder explicitement le service Finance dans l'infra staging avec la reference immutable `repository@sha256:...`.
4. Verifier le backup staging hors workflow, puis fournir son uuid au gate de deploiement.
5. Deployer staging via le mecanisme d'orchestration approuve.
6. Executer les healthchecks et smoke tests.
7. Rollback sur l'ancien digest si une gate echoue.

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
