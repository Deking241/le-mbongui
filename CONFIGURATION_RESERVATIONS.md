# Connecter les réservations à Google Sheets et à votre e-mail

Le formulaire est prêt à envoyer chaque demande vers un **Web App Google Apps Script**. Une fois connecté, chaque réservation apparaîtra dans l’onglet `Réservations` de votre Google Sheet et une notification e-mail sera envoyée.

## Installation (environ 5 minutes)

1. Créez un nouveau Google Sheet, par exemple **Réservations — Le Mbongui**.
2. Dans ce fichier : **Extensions → Apps Script**.
3. Remplacez le code affiché par le contenu de `google-apps-script/Code.gs`.
4. Dans la première ligne du script, remplacez `VOTRE-ADRESSE-EMAIL@exemple.com` par votre vraie adresse e-mail.
5. Cliquez sur **Déployer → Nouveau déploiement → Application Web**.
6. Paramètres : *Exécuter en tant que* : **Moi** ; *Qui a accès* : **Tout le monde**.
7. Autorisez le script, puis copiez l’URL qui se termine par `/exec`.
8. Dans `js/script.js`, remplacez la valeur de `GOOGLE_APPS_SCRIPT_URL` par cette URL.

## Résultat

- Vos clients remplissent le formulaire du site.
- Leur demande est ajoutée au Google Sheet.
- Vous recevez immédiatement les détails par e-mail.

Ne communiquez jamais l’URL d’édition de votre Apps Script ni l’accès à votre Google Sheet aux visiteurs.
