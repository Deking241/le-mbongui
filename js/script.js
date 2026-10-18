document.addEventListener('DOMContentLoaded', () => {
  // Renseigner les deux valeurs publiques après la configuration Cloudflare.
  // Une configuration vide bloque l'envoi : aucun contournement WhatsApp/e-mail.
  const RESERVATION_API_URL = '';
  const TURNSTILE_SITE_KEY = '';
  const banner = document.querySelector('.cookie-banner');
  const storage = {
    get(key) {try {return localStorage.getItem(key);} catch {return null;}},
    set(key,value) {try {localStorage.setItem(key,value);} catch {}}
  };
  if (banner && !storage.get('cookie-choice')) banner.hidden = false;
  banner?.addEventListener('click', e => { const choice = e.target.dataset.cookie; if (!choice) return; storage.set('cookie-choice', choice); banner.hidden = true; });
  const header = document.querySelector('.site-header');
  const menu = document.querySelector('.nav');
  const toggle = document.querySelector('.menu-toggle');
  toggle.addEventListener('click', () => { const open = menu.classList.toggle('open'); toggle.setAttribute('aria-expanded', open); });
  document.querySelectorAll('.nav a').forEach(a => a.addEventListener('click', () => { menu.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }));
  window.addEventListener('scroll', () => header.classList.toggle('scrolled', scrollY > 25));
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if(entry.isIntersecting) entry.target.classList.add('visible'); }), {threshold:.12});
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  const stats = document.querySelector('.hero-stats');
  let counted = false;
  new IntersectionObserver(entries => { if(entries[0].isIntersecting && !counted) { counted = true; document.querySelectorAll('[data-count]').forEach(el => { const target=+el.dataset.count; let n=0; const tick=()=>{ n+=Math.ceil(target/32); if(n<target){el.textContent=n;requestAnimationFrame(tick)}else el.textContent=target+'+'};tick(); }); } }, {threshold:.5}).observe(stats);
  document.querySelectorAll('.filters').forEach(group => group.addEventListener('click', e => { if(e.target.tagName !== 'BUTTON') return; group.querySelector('.active').classList.remove('active'); e.target.classList.add('active'); const target=e.target.dataset.filterValue; const cards=group.dataset.filter==='games'?document.querySelectorAll('.game-card'):document.querySelectorAll('.event-card'); cards.forEach(card => card.classList.toggle('hidden-card', target!=='all'&&!card.dataset.category.includes(target))); }));
  const lightbox=document.querySelector('.lightbox'), lightboxImg=lightbox.querySelector('img'); document.querySelectorAll('.gallery-item').forEach(item=>item.addEventListener('click',()=>{lightboxImg.src=item.querySelector('img').src;lightbox.classList.add('open');lightbox.setAttribute('aria-hidden','false')})); lightbox.addEventListener('click',e=>{if(e.target===lightbox||e.target.tagName==='BUTTON'){lightbox.classList.remove('open');lightbox.setAttribute('aria-hidden','true')}});
  document.querySelectorAll('.join-btn').forEach(btn=>btn.addEventListener('click',()=>{document.querySelector('[name="type"]').value='Tournoi';document.querySelector('#reservation').scrollIntoView({behavior:'smooth'});}));
  const form = document.querySelector('.booking-form');
  const status = form.querySelector('.form-status');
  const submitBtn = form.querySelector('button[type="submit"], button:not([type])');
  let widget, token = '', busy = false, requestId, previousPayload;
  const showError = message => {status.style.color = '#ff78c7'; status.textContent = message;};
  const ready = () => {if (submitBtn) submitBtn.disabled = busy || !token;};
  const resetChallenge = () => {
    token = ''; ready();
    if (widget !== undefined && window.turnstile) window.turnstile.reset(widget);
  };
  if (submitBtn) submitBtn.disabled = true;
  if (!RESERVATION_API_URL || !TURNSTILE_SITE_KEY) {
    showError('La réservation en ligne est en cours de configuration. Aucun envoi automatique n’est possible pour le moment.');
  } else {
    const container = document.createElement('div');
    form.insertBefore(container, status);
    window.mbonguiTurnstileReady = () => {
      try {
        widget = window.turnstile.render(container, {
          sitekey: TURNSTILE_SITE_KEY, action: 'reservation', size: 'flexible',
          callback: value => {token = value; ready();},
          'expired-callback': () => {token = ''; ready();},
          'error-callback': () => {token = ''; ready(); showError('Vérification anti-robots indisponible. Rechargez la page.');}
        });
      } catch {showError('Vérification anti-robots indisponible. Rechargez la page.');}
    };
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=mbonguiTurnstileReady&render=explicit';
    script.async = true; script.defer = true;
    script.onerror = () => showError('Impossible de charger la protection anti-robots. Rechargez la page.');
    document.head.appendChild(script);
  }
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (busy) return;
    if (!RESERVATION_API_URL || !TURNSTILE_SITE_KEY || !token) {
      showError('La réservation en ligne ou la vérification anti-robots n’est pas prête.'); return;
    }
    if (!form.checkValidity()) {
      showError('Veuillez renseigner les champs obligatoires.'); form.reportValidity(); return;
    }
    const data = Object.fromEntries(new FormData(form).entries());
    delete data['cf-turnstile-response'];
    const serialized = JSON.stringify(data);
    // Conserver l'identifiant lors d'une reprise réseau, mais pas si les champs changent.
    if (!requestId || serialized !== previousPayload) requestId = crypto.randomUUID();
    previousPayload = serialized;
    busy = true; ready(); status.style.color = 'var(--lime)';
    status.textContent = 'Enregistrement de votre demande…';
    try {
      const response = await fetch(RESERVATION_API_URL, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({...data,request_id:requestId,turnstile_token:token}),
        signal:AbortSignal.timeout(20000)
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw Error(result.error || 'Envoi impossible. Réessayez plus tard.');
      status.style.color = 'var(--lime)';
      status.textContent = `Merci ! Votre demande est enregistrée, en attente de confirmation. Référence : ${result.id}`;
      form.reset(); requestId = undefined; previousPayload = undefined;
    } catch(e) {
      showError(e.name === 'TimeoutError' || e.name === 'TypeError'
        ? 'Connexion interrompue. Réessayez sans modifier les champs : une demande déjà enregistrée ne sera pas créée deux fois.'
        : e.message);
    } finally {busy = false; resetChallenge();}
  });
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.game-card, .event-card, .price-card').forEach(card => {
      card.addEventListener('pointermove', event => {
        const box = card.getBoundingClientRect();
        const rotateX = ((event.clientY - box.top) / box.height - .5) * -5;
        const rotateY = ((event.clientX - box.left) / box.width - .5) * 5;
        card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`;
      });
      card.addEventListener('pointerleave', () => { card.style.transform = ''; });
    });
  }
});
