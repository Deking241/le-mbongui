/**
 * Receptionne les demandes du site Le Mbongui Bar a Jeux.
 * A coller dans un projet Google Apps Script lie a votre Google Sheet
 * (Extensions > Apps Script), puis deployer en Application Web.
 */
const NOTIFICATION_EMAIL = 'orphenova0@gmail.com';
const SHEET_NAME = 'Réservations';
const HEADERS = ['Reçue le', 'Prénom', 'Nom', 'Téléphone', 'E-mail', 'Type', 'Personnes', 'Date', 'Heure', 'Message', 'Statut'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!data.prenom || !data.telephone) {
      return json_({ ok: false, error: 'Champs manquants' });
    }

    const sheet = getOrCreateSheet_();
    sheet.appendRow([
      new Date(),
      clean_(data.prenom), clean_(data.nom), clean_(data.telephone),
      clean_(data.email), clean_(data.type), clean_(data.personnes),
      clean_(data.date), clean_(data.heure), clean_(data.message),
      'Nouvelle'
    ]);

    const subject = `Nouvelle réservation : ${data.prenom || ''} ${data.nom || ''}`;
    const message = [
      'Nouvelle demande de réservation Le Mbongui Bar à Jeux', '',
      `Client : ${data.prenom || ''} ${data.nom || ''}`,
      `Téléphone : ${data.telephone || ''}`,
      `E-mail : ${data.email || ''}`,
      `Formule : ${data.type || ''}`,
      `Personnes : ${data.personnes || ''}`,
      `Date / heure : ${data.date || ''} à ${data.heure || ''}`,
      `Message : ${data.message || '-'}`, '',
      `Google Sheet : ${SpreadsheetApp.getActiveSpreadsheet().getUrl()}`
    ].join('\n');
    const options = {};
    if (data.email) options.replyTo = String(data.email);
    MailApp.sendEmail(NOTIFICATION_EMAIL, subject, message, options);

    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

// Permet de verifier que le deploiement repond en ouvrant l'URL /exec dans un navigateur.
function doGet() {
  return json_({ ok: true, service: 'Le Mbongui reservations' });
}

// Empeche l'injection de formules dans le Sheet (valeurs commencant par = + - @).
function clean_(value) {
  const text = String(value == null ? '' : value).trim();
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
  }
  return sheet;
}
