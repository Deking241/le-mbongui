const requiredFields = [
  'prenom',
  'nom',
  'telephone',
  'email',
  'type',
  'personnes',
  'date',
  'heure'
];

const reservationTypes = [
  'Session jeu',
  'Session gaming',
  'Jeux de société',
  'Groupe',
  'Tournoi',
  'Événement'
];

const guestOptions = [
  '1 personne',
  '2 personnes',
  '3 à 5 personnes',
  '6 personnes ou plus'
];

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

function isValidReservation(data) {
  return Boolean(
    data &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    !data.website &&
    data.consent === 'on' &&
    requiredFields.every(field =>
      typeof data[field] === 'string' &&
      data[field].trim().length > 0 &&
      data[field].length <= 200
    ) &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) &&
    reservationTypes.includes(data.type) &&
    guestOptions.includes(data.personnes) &&
    /^\d{4}-\d{2}-\d{2}$/.test(data.date) &&
    /^\d{2}:\d{2}$/.test(data.heure) &&
    (data.message === undefined ||
      (typeof data.message === 'string' && data.message.length <= 2000))
  );
}

async function handleReservation(request, env) {
  if (request.method !== 'POST') {
    return json({ error: 'Méthode non autorisée.' }, 405);
  }

  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) {
    return json({ error: 'Origine non autorisée.' }, 403);
  }

  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json')) {
    return json({ error: 'Le formulaire doit être envoyé au format JSON.' }, 415);
  }

  if (!env.RESERVATION_WEBHOOK_URL) {
    return json({ error: 'Le service de réservation n’est pas encore configuré.' }, 503);
  }

  let data;
  try {
    const raw = await request.text();
    if (new TextEncoder().encode(raw).byteLength > 10000) {
      return json({ error: 'La demande est trop volumineuse.' }, 413);
    }
    data = JSON.parse(raw);
  } catch {
    return json({ error: 'Le contenu de la demande est invalide.' }, 400);
  }

  if (!isValidReservation(data)) {
    return json({ error: 'Vérifie les champs obligatoires du formulaire.' }, 400);
  }

  let webhookUrl;
  try {
    webhookUrl = new URL(env.RESERVATION_WEBHOOK_URL);
  } catch {
    return json({ error: 'Le service de réservation est mal configuré.' }, 503);
  }
  if (
    webhookUrl.protocol !== 'https:' ||
    webhookUrl.hostname !== 'script.google.com' ||
    !/^\/macros\/s\/[^/]+\/exec$/.test(webhookUrl.pathname)
  ) {
    console.error('Reservation webhook URL is not a Google Apps Script production URL.');
    return json({ error: 'Le service de réservation est mal configuré.' }, 503);
  }

  const reservation = Object.fromEntries([
    ...requiredFields.map(field => [field, data[field].trim()]),
    ['message', typeof data.message === 'string' ? data.message.trim() : '']
  ]);

  try {
    const webhookResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reservation),
      redirect: 'follow',
      signal: AbortSignal.timeout(20000)
    });
    if (!webhookResponse.ok) {
      console.error(`Reservation email service returned HTTP ${webhookResponse.status}.`);
      return json(
        { error: 'La demande n’a pas pu être envoyée. Réessaie plus tard.' },
        502
      );
    }

    let result;
    try {
      result = await webhookResponse.json();
    } catch {
      return json(
        { error: 'Le service e-mail a renvoyé une réponse inattendue. Réessaie plus tard.' },
        502
      );
    }
    if (result?.ok !== true) {
      return json(
        { error: 'L’envoi de la demande a échoué. Réessaie plus tard.' },
        502
      );
    }

    return json({ ok: true }, 201);
  } catch (error) {
    console.error('Reservation email request failed:', error);
    return json(
      { error: 'Le service e-mail est momentanément indisponible. Réessaie plus tard.' },
      502
    );
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/reservations') {
      return handleReservation(request, env);
    }
    return env.ASSETS.fetch(request);
  }
};
