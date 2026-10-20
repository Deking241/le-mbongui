/** Reception des reservations Le Mbongui Bar a Jeux. */
const NOTIFICATION_EMAIL = 'dekingspeed@gmail.com';
const SHEET_NAME = 'Reservations';
const HEADERS = ['Recue le', 'Prenom', 'Nom', 'Telephone', 'E-mail', 'Type', 'Personnes', 'Date', 'Heure', 'Message', 'Statut'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (!data.prenom || !data.telephone) return json_({ ok: false, error: 'Champs manquants' });

    const sheet = getOrCreateSheet_();
    sheet.appendRow([new Date(), clean_(data.prenom), clean_(data.nom), clean_(data.telephone), clean_(data.email), clean_(data.type), clean_(data.personnes), clean_(data.date), clean_(data.heure), clean_(data.message), 'Nouvelle']);

    const ownerSubject = `Nouvelle reservation : ${data.prenom || ''} ${data.nom || ''}`;
    const ownerMessage = [
      'Nouvelle demande de reservation Le Mbongui Bar a Jeux', '',
      `Client : ${data.prenom || ''} ${data.nom || ''}`,
      `Telephone : ${data.telephone || ''}`,
      `E-mail : ${data.email || ''}`,
      `Formule : ${data.type || ''}`,
      `Personnes : ${data.personnes || ''}`,
      `Date / heure : ${data.date || ''} a ${data.heure || ''}`,
      `Message : ${data.message || '-'}`, '',
      `Google Sheet : ${SpreadsheetApp.getActiveSpreadsheet().getUrl()}`
    ].join('\n');
    const options = {};
    if (data.email) options.replyTo = String(data.email);
    MailApp.sendEmail(NOTIFICATION_EMAIL, ownerSubject, ownerMessage, options);

    if (data.email) {
      const clientSubject = 'Confirmation de votre reservation au Le Mbongui';
      const clientMessage = [
        `Bonjour ${data.prenom || ''},`, '',
        'Merci pour votre reservation au Le Mbongui Bar a Jeux. Voici les details de votre demande :', '',
        `Nom : ${data.prenom || ''} ${data.nom || ''}`,
        `Telephone : ${data.telephone || ''}`,
        `E-mail : ${data.email || ''}`,
        `Formule : ${data.type || ''}`,
        `Nombre de personnes : ${data.personnes || ''}`,
        `Date : ${data.date || ''}`,
        `Heure : ${data.heure || ''}`,
        data.message ? `Message : ${data.message}` : '', '',
        'Nous vous contacterons tres bientot pour confirmer votre reservation.',
        'Au besoin, joignez-nous au : +241 074 866 022', '',
        'A tres bientot au Le Mbongui.',
        "L'equipe du Mbongui Bar a Jeux"
      ].join('\n');
      MailApp.sendEmail(data.email, clientSubject, clientMessage);
    }
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return json_({ ok: true, service: 'Le Mbongui reservations' });
}

function clean_(value) {
  const text = String(value == null ? '' : value).trim();
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
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
