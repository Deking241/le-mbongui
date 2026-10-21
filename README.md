# Le Mbongui — Site vitrine

Site marketing responsive pour un bar à jeux vidéo et de société, créé en HTML5, CSS3 et JavaScript vanilla.

## Lancer localement

Ouvrez simplement `index.html` dans votre navigateur. Pour une expérience de développement plus confortable, utilisez l’extension **Live Server** de VS Code sur le dossier `projet`.

## Personnalisation rapide

- Nom, adresse, téléphone et e-mail : recherchez `Le Mbongui`, `Libreville`, `+241` et `orphenova0@gmail.com` dans `index.html`.
- Tarifs : modifiez les montants dans les cartes de la section `#tarifs` de `index.html`.
- Images : les photos actuelles sont chargées depuis Unsplash. Remplacez les attributs `src` par vos propres fichiers, idéalement déposés dans `images/`.
- Réservation : le formulaire envoie automatiquement la demande au Worker Cloudflare, puis Google Apps Script envoie l’e-mail et ajoute la demande au Sheet. Le client n’a pas besoin d’ouvrir Gmail. Voir `CONFIGURATION_RESERVATIONS.md`.

## Publication Cloudflare Workers

Le site statique est déployé avec Wrangler :

- Site statique : `npm run deploy:site` (équivalent à `npx wrangler deploy --config wrangler.toml`)

Le Worker Cloudflare sert le site et relaie les réservations vers Google Apps Script. Avant le déploiement, configurez le secret `RESERVATION_WEBHOOK_URL` comme indiqué dans `CONFIGURATION_RESERVATIONS.md`. Il n’y a ni quota D1 ni vérification Turnstile.
