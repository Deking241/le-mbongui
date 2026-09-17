/**
 * Réceptionne les demandes du site Le Mbongui Bar à Jeux.
 * À coller dans un projet Google Apps Script lié à votre Google Sheet.
 */
const NOTIFICATION_EMAIL = 'VOTRE-ADRESSE-EMAIL@exemple.com';
const SHEET_NAME = 'Réservations';

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  const sheet = getOrCreateSheet_();
  sheet.appendRow([
    new Date(), data.prenom || '', data.nom || '', data.telephone || '',
    data.email || '', data.type || '', data.personnes || '', data.date || '',
    data.heure || '', data.message || ''
  ]);

  const subject = `Nouvelle réservation — ${data.prenom || ''} ${data.nom || ''}`;
  const message = [
    'Nouvelle demande de réservation Le Mbongui Bar à Jeux', '',
    `Client : ${data.prenom || ''} ${data.nom || ''}`,
    `Téléphone : ${data.telephone || ''}`,
    `E-mail : ${data.email || ''}`,
    `Formule : ${data.type || ''}`,
    `Personnes : ${data.personnes || ''}`,
    `Date / heure : ${data.date || ''} — ${data.heure || ''}`,
    `Message : ${data.message || '—'}`
  ].join('\n');
  MailApp.sendEmail(NOTIFICATION_EMAIL, subject, message);

  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getOrCreateSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow(['Reçue le', 'Prénom', 'Nom', 'Téléphone', 'E-mail', 'Type', 'Personnes', 'Date', 'Heure', 'Message']);
    sheet.setFrozenRows(1);
  }
  return sheet;
}
