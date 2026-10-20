# Réservations privées avec Cloudflare Workers et D1

Cette version remplace le chemin Apps Script / WhatsApp / mailto du formulaire.
État au 20 octobre 2026 : le Worker API et le site sont déployés, D1 est initialisée,
et les secrets restent configurés dans Cloudflare. Le formulaire a été corrigé pour accepter
les dates au format `AAAA-MM-JJ` et le type « Session jeu ».
L'URL du site est `https://le-mbongui.bernisorphe.workers.dev` et l'API est
`https://mbongui-reservations.bernisorphe.workers.dev/api/reservations`.
Le domaine `lembongui.ga` ne résout pas encore en DNS ; utilisez l'URL workers.dev tant que ce point n'est pas réglé.
Un test de réservation complet avec jeton Turnstile n'a pas été soumis : ne créez pas de fausse réservation pour tester.

## Fonctionnement

Les demandes sont stockées dans une base D1 accessible uniquement aux administrateurs Cloudflare.
Aucune route publique ne permet de lister ou de consulter les réservations.
Le formulaire annonce un succès seulement après confirmation de l'écriture.
Une demande n'est pas une réservation confirmée : son statut initial est `pending`.
Il n'y a pas encore d'interface d'administration ni de notification e-mail automatique.

Le quota est de **3 demandes sur une fenêtre glissante de 24 heures pour chaque téléphone ET chaque e-mail** :
si l'un des deux a atteint 3 demandes, une nouvelle demande est refusée (HTTP 429).
Les annulations ne rendent pas de quota, afin de ne pas faciliter le spam.
Une limite supplémentaire de 20 demandes enregistrées par IP sur 10 minutes protège les réseaux partagés.
Les limites sont appliquées dans un trigger SQL, y compris en cas d'envois simultanés.
Les contacts et l'IP utilisés comme clés de quota sont pseudonymisés par HMAC ; les coordonnées nécessaires
au traitement restent dans `details` et nécessitent un accès administrateur protégé.
Sans validation du téléphone ou de l'e-mail (OTP), un visiteur peut changer ses coordonnées pour contourner
le quota : Turnstile et la limite IP réduisent ce risque sans garantir une identité client.
Cette limite IP ne remplace pas une protection réseau contre un déni de service.

## Installation

1. Depuis une machine avec Node.js et accès Internet, installer/utiliser Wrangler, puis s'authentifier :
   `npx wrangler login`.
2. Créer une base : `npx wrangler d1 create mbongui-reservations`.
3. Créer à la racine un fichier `wrangler.jsonc` contenant les valeurs de votre compte :

```jsonc
{
  "name": "mbongui-reservations",
  "main": "backend/worker.mjs",
  "compatibility_date": "2026-10-20",
  "vars": {
    "ALLOWED_ORIGINS": "https://le-mbongui.bernisorphe.workers.dev,https://le-mbongui.vercel.app,https://lembongui.ga"
  },
  "d1_databases": [{
    "binding": "DB",
    "database_name": "mbongui-reservations",
    "database_id": "REMPLACER_PAR_ID_RETOURNE"
  }]
}
```

Ne garder que les origines réellement utilisées. Le Worker API est distinct du Worker du site :
ne pas remplacer la configuration de déploiement du site ni ajouter une liaison `assets` ici.

4. Initialiser la base :
   `npx wrangler d1 execute mbongui-reservations --remote --file=backend/schema.sql --config wrangler.jsonc`.
5. Dans Cloudflare Turnstile, créer un widget pour les domaines du site autorisés.
   Utiliser une clé de production, pas une clé de test. Créer le secret serveur :
   `npx wrangler secret put TURNSTILE_SECRET_KEY --config wrangler.jsonc`.
6. Créer un secret aléatoire de 32 octets minimum, stocké dans un gestionnaire de mots de passe,
   puis `npx wrangler secret put HASH_SECRET --config wrangler.jsonc`. Ne jamais publier les secrets ni les coller dans une PR.
   Changer HASH_SECRET réinitialise de fait les clés de quota : ne pas le faire pour contourner les limites.
7. Déployer le backend : `npx wrangler deploy --config wrangler.jsonc`. L’URL API et la clé Turnstile publique sont déjà renseignées dans `js/script.js`.
   Seule la clé publique va dans le navigateur; les secrets restent dans Cloudflare.
8. Déployer le site statique séparément avec `npx wrangler deploy --config wrangler.toml`.
9. Tester sur une prévisualisation dont l'origine et le domaine Turnstile sont explicitement autorisés.
   Ne pas activer un joker CORS pour les prévisualisations.
10. Avant mise en ligne, actualiser `rgpd.html` avec les traitements réellement configurés :
    finalités, prestataire, contacts, droits, durée de conservation et usage anti-abus.
    Choisir et mettre en place une durée de conservation des réservations et des sauvegardes.
    La présente version n'effectue aucune suppression automatique.

## Lire et traiter les demandes

Dans le tableau de bord Cloudflare, ouvrir D1 puis la base `mbongui-reservations` et sa console SQL :

```sql
SELECT id, datetime(created_at, 'unixepoch') AS reception_utc, status,
       json_extract(details, '$.prenom') AS prenom,
       json_extract(details, '$.nom') AS nom,
       json_extract(details, '$.telephone') AS telephone,
       json_extract(details, '$.email') AS email,
       json_extract(details, '$.date') AS date,
       json_extract(details, '$.heure') AS heure,
       details
FROM reservations ORDER BY created_at DESC LIMIT 100;
```

Les dates de réception sont UTC ; l'heure choisie par le client est celle de Libreville (UTC+1).
Pour confirmer manuellement, remplacer l'identifiant dans :
`UPDATE reservations SET status='confirmed' WHERE id='IDENTIFIANT';`.
L'opération ne contacte pas le client : la confirmation reste manuelle.
Protéger le compte Cloudflare par une authentification forte et limiter les accès.

## Vérifications avant fusion

- 3 demandes acceptées avec un même téléphone ou e-mail, quatrième refusée.
- Changer seulement le téléphone ne contourne pas la limite e-mail, et inversement.
- `074 866 022`, `+241 74 866 022` et `+241 074 866 022` désignent le même numéro.
- Après 24 heures, les anciennes demandes ne consomment plus le quota.
- Envois concurrents : pas plus de 3 lignes pour le même contact.
- Reprise après perte réseau : même identifiant et mêmes données, pas de doublon.
- Pas de succès affiché si la base ou Turnstile échoue ; aucune redirection de secours contournant le quota.
- Origine non autorisée, faux jeton, mauvais domaine/action Turnstile, consentement absent,
  date passée, corps trop volumineux : refus.
- Vérifier téléphone réel, mobile, menu, filtres, et navigateur avec stockage local bloqué.

La PR Phase 0 modifie aussi `js/script.js` : préserver ses correctifs de compteurs, filtres
et accents lors de la fusion. Le présent changement inclut une protection de localStorage
pour que le formulaire ne tombe pas en panne dans les navigateurs qui le bloquent.

## Ancien parcours

`google-apps-script/Code.gs` et `api/server.js` restent dans le dépôt comme anciennes alternatives,
mais ne sont plus appelés par ce formulaire. S'ils ont été déployés ailleurs, les désactiver
avant la mise en ligne pour ne pas laisser une entrée non protégée.
Le backend seul ne garantit pas la disponibilité des créneaux et ne gère pas de paiement.
