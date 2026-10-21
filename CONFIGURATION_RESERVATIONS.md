# Réservations envoyées directement par e-mail

Le client remplit le formulaire et clique sur **Envoyer ma demande**. Le site transmet la demande au Worker Cloudflare, qui appelle Google Apps Script. Apps Script envoie l’e-mail depuis le serveur, sans ouvrir Gmail sur le téléphone ou l’ordinateur du client, et ajoute la demande au Google Sheet.

Les nouvelles demandes sont envoyées à `dekingspeed@gmail.com`. Une copie de demande est aussi envoyée à l’adresse e-mail saisie par le client. L’équipe doit confirmer la disponibilité par la suite : l’envoi d’une demande ne confirme pas automatiquement une place.

## Configuration

1. Vérifiez que le déploiement de l’application Google Apps Script est une application Web active, accessible à tous, et que son code envoie les notifications à `dekingspeed@gmail.com`.
2. Dans PowerShell, placez-vous dans le dossier du projet :

   ```powershell
   cd "C:\Users\LENOVO\OneDrive\Documents\projet marketing\le-mbongui-site\projet"
   ```

3. Enregistrez l’URL de production Apps Script comme secret sur le Worker du site :

   ```powershell
   npx wrangler secret put RESERVATION_WEBHOOK_URL --config wrangler.toml
   ```

   Collez l’URL Apps Script se terminant par `/exec` quand Wrangler la demande. Ne mettez pas cette URL dans un fichier du dépôt.

4. Publiez le site et son endpoint de réservation :

   ```powershell
   npm run deploy:site
   ```

## Parcours et limites

- Le client ne quitte pas le site pour ouvrir une application e-mail : l’envoi est fait côté serveur par Apps Script.
- La demande est inscrite dans l’onglet `Reservations` du Google Sheet et les notifications sont envoyées par e-mail.
- Il n’y a pas de quota D1 ni de vérification Turnstile.
- Le formulaire recueille une demande de date, d’heure et de nombre de personnes. Il ne vérifie pas le nombre de places restantes et ne confirme pas automatiquement la disponibilité.
- En cas d’échec d’envoi, le site affiche une erreur et garde les champs du formulaire afin que le client puisse réessayer.
