const MAX_BODY = 16384;
const encoder = new TextEncoder();
const json = (status, body, headers = {}) => new Response(JSON.stringify(body), {
  status, headers: {'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers}
});

export function normalizePhone(value) {
  let p = String(value || '').replace(/[\s().-]/g, '');
  if (p.startsWith('00')) p = '+' + p.slice(2);
  // Numéros locaux gabonais : 074... et +24174... ont la même clé.
  if (/^0\d{8}$/.test(p)) p = '+241' + p.slice(1);
  if (/^\+2410\d{8}$/.test(p)) p = '+241' + p.slice(5);
  if (!/^\+[1-9]\d{7,14}$/.test(p)) throw Error('Téléphone invalide : utilisez le format international (+241…).');
  return p;
}

export function validate(input, now = new Date()) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Error('Données invalides.');
  const get = (key, max, required = true) => {
    if (typeof input[key] !== 'string') {
      if (!required && input[key] == null) return '';
      throw Error('Champ invalide : ' + key);
    }
    const s = input[key].trim();
    if ((required && !s) || s.length > max || /[\u0008\u000b\u000c\u000e-\u001f]/.test(s)) throw Error('Champ invalide : ' + key);
    return s;
  };
  if (get('website', 200, false)) throw Error('Demande refusée.');
  if (input.consent !== 'on') throw Error('Votre consentement est requis.');
  const email = get('email', 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw Error('Adresse e-mail invalide.');
  const date = get('date', 10), heure = get('heure', 5);
  const instant = new Date(`${date}T${heure}:00+01:00`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(heure)
    || !Number.isFinite(+instant) || new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) !== date
    || instant <= now) throw Error('Choisissez une date et une heure futures (heure de Libreville).');
  const type = get('type', 40), personnes = get('personnes', 40);
  if (!['Session jeu','Session gaming','Jeux de société','Groupe','Tournoi','Événement'].includes(type)
    || !['1 personne','2 personnes','3 à 5 personnes','6 personnes ou plus'].includes(personnes)) throw Error('Formule ou nombre de personnes invalide.');
  return {prenom:get('prenom',80), nom:get('nom',80), telephone:normalizePhone(get('telephone',32)),
    email, type, personnes, date, heure, message:get('message',2000,false), consent:true};
}

async function readBody(request) {
  if (!request.body) throw Error('empty');
  const reader = request.body.getReader();
  const chunks = []; let size = 0;
  for (;;) {
    const {done, value} = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY) {await reader.cancel(); throw Error('large');}
    chunks.push(value);
  }
  const buffer = new Uint8Array(size); let offset = 0;
  for (const c of chunks) {buffer.set(c, offset); offset += c.length;}
  return JSON.parse(new TextDecoder().decode(buffer));
}

export default {
  async fetch(request, env) {
    const origins = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    const origin = request.headers.get('Origin');
    if (!origin || !origins.includes(origin)) return json(403, {error:'Origine non autorisée.'});
    const headers = {'Access-Control-Allow-Origin':origin, 'Vary':'Origin',
      'Access-Control-Allow-Methods':'POST, OPTIONS', 'Access-Control-Allow-Headers':'Content-Type',
      'Access-Control-Expose-Headers':'Retry-After'};
    const reply = (status, body, extra = {}) => json(status, body, {...headers,...extra});
    if (new URL(request.url).pathname !== '/api/reservations') return reply(404,{error:'Introuvable.'});
    if (request.method === 'OPTIONS') return new Response(null,{status:204, headers});
    if (request.method !== 'POST') return reply(405,{error:'Méthode non autorisée.'},{Allow:'POST, OPTIONS'});
    if (!env.DB || !env.HASH_SECRET) return reply(503,{error:'Réservations temporairement indisponibles.'});
    if (request.headers.get('Content-Type')?.split(';')[0] !== 'application/json') return reply(415,{error:'Format non pris en charge.'});
    let input, data;
    try {input = await readBody(request);}
    catch (e) {return reply(e.message === 'large' ? 413 : 400,{error:'Demande illisible ou trop volumineuse.'});}
    try {data = validate(input);}
    catch(e) {return reply(400,{error:e.message});}
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.request_id || ''))
      return reply(400,{error:'Identifiant de demande invalide.'});
    // CF-Connecting-IP est fourni par Cloudflare ; ne pas faire confiance à X-Forwarded-For.
    const ip = request.headers.get('CF-Connecting-IP');
    if (!ip) return reply(503,{error:'Vérification réseau indisponible.'});
    try {
      const key = await crypto.subtle.importKey('raw',encoder.encode(env.HASH_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
      const hash = async value => Array.from(new Uint8Array(await crypto.subtle.sign('HMAC',key,encoder.encode(value))),x=>x.toString(16).padStart(2,'0')).join('');
      const details = JSON.stringify(data);
      const [emailKey,phoneKey,ipKey,payloadHash] = await Promise.all([
        hash('email:' + data.email),hash('phone:' + data.telephone),hash('ip:' + ip),hash('payload:' + details)
      ]);
      // Un seul INSERT et un trigger SQL : les requêtes concurrentes ne contournent pas le quota.
      try {
        await env.DB.prepare('INSERT INTO reservations(id,created_at,email_key,phone_key,ip_key,payload_hash,details) VALUES(?,?,?,?,?,?,?)')
          .bind(input.request_id, Math.floor(Date.now()/1000), emailKey,phoneKey,ipKey,payloadHash,details).run();
      } catch (e) {
        if (/CONTACT_QUOTA/.test(String(e))) return reply(429,{error:'Limite atteinte : 3 demandes sur 24 heures par téléphone ou e-mail. Réessayez plus tard.'},{'Retry-After':'86400'});
        if (/IP_QUOTA/.test(String(e))) return reply(429,{error:'Trop de demandes depuis ce réseau. Réessayez dans 10 minutes.'},{'Retry-After':'600'});
        const previous = await env.DB.prepare('SELECT payload_hash FROM reservations WHERE id = ?').bind(input.request_id).first();
        if (!previous || previous.payload_hash !== payloadHash) throw e;
        // Même identifiant et mêmes informations : reprise après une réponse réseau perdue.
      }
      return reply(201,{ok:true,id:input.request_id,message:'Demande enregistrée, en attente de confirmation.'});
    } catch {
      // Ne pas journaliser les coordonnées personnelles ni les secrets.
      return reply(503,{error:'Envoi impossible pour le moment. Réessayez sans changer vos informations.'});
    }
  }
};
