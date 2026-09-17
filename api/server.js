// API reservations: deploy separately from the static website (Render/Railway/VPS).
// Node 18+ required. Set RESERVATION_WEBHOOK_URL in the host environment.
import http from 'node:http';

const port = process.env.PORT || 3000;
const webhook = process.env.RESERVATION_WEBHOOK_URL;
const recent = new Map();
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://VOTRE-DOMAINE.fr';
const fields = ['prenom','nom','telephone','email','type','personnes','date','heure'];

http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.writeHead(204).end();
  if (req.method !== 'POST' || req.url !== '/api/reservations') return res.writeHead(404).end();
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  if (recent.get(ip) > Date.now() - 60000) return json(res, 429, {error:'Veuillez patienter une minute.'});
  let raw=''; for await (const chunk of req) raw += chunk;
  try {
    const data = JSON.parse(raw);
    if (data.website || fields.some(key => !String(data[key] || '').trim()) || !/^\S+@\S+\.\S+$/.test(data.email)) throw Error('Données invalides');
    recent.set(ip, Date.now());
    if (!webhook) throw Error('Service non configuré');
    const response = await fetch(webhook, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...data, receivedAt:new Date().toISOString()})});
    if (!response.ok) throw Error('Service indisponible');
    json(res, 201, {ok:true});
  } catch (error) { json(res, 400, {error:'La réservation n’a pas pu être envoyée.'}); }
}).listen(port, () => console.log(`Reservation API on ${port}`));
function json(res, status, body){res.writeHead(status, {'Content-Type':'application/json'});res.end(JSON.stringify(body));}
