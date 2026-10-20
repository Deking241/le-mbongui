# Le Mbongui — Site vitrine

Site marketing responsive pour un bar à jeux vidéo et de société, créé en HTML5, CSS3 et JavaScript vanilla.

## Lancer localement

Ouvrez simplement `index.html` dans votre navigateur. Pour une expérience de développement plus confortable, utilisez l’extension **Live Server** de VS Code sur le dossier `projet`.

## Personnalisation rapide

- Nom, adresse, téléphone et e-mail : recherchez `Le Mbongui`, `Libreville`, `+241` et `orphenova0@gmail.com` dans `index.html`.
- Tarifs : modifiez les montants dans les cartes de la section `#tarifs` de `index.html`.
- Images : les photos actuelles sont chargées depuis Unsplash. Remplacez les attributs `src` par vos propres fichiers, idéalement déposés dans `images/`.
- Réservation : le formulaire envoie les demandes à un Worker Cloudflare, valide Turnstile côté serveur et enregistre les demandes dans D1. Voir `CONFIGURATION_RESERVATIONS.md`.

## Publication Cloudflare Workers

Le site et l’API utilisent deux configurations séparées :

- Site statique : `npx wrangler deploy --config wrangler.toml`
- API : `npx wrangler deploy --config wrangler.jsonc`
- D1 : `npx wrangler d1 execute mbongui-reservations --remote --file=backend/schema.sql --config wrangler.jsonc`

Les secrets `TURNSTILE_SECRET_KEY` et `HASH_SECRET` restent dans Cloudflare et ne doivent pas être ajoutés au dépôt.
