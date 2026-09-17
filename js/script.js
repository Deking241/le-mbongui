document.addEventListener('DOMContentLoaded', () => {
  const WHATSAPP_NUMBER = '24174866022';
  const RESERVATION_EMAIL = 'orphenova0@gmail.com';
  const banner = document.querySelector('.cookie-banner');
  if (banner && !localStorage.getItem('cookie-choice')) banner.hidden = false;
  banner?.addEventListener('click', e => { const choice = e.target.dataset.cookie; if (!choice) return; localStorage.setItem('cookie-choice', choice); banner.hidden = true; });
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
  form.addEventListener('submit', e => {
    e.preventDefault();
    if (!form.checkValidity()) {
      status.textContent = 'Veuillez renseigner les champs obligatoires.';
      status.style.color = '#ff78c7';
      form.reportValidity();
      return;
    }
    const data = Object.fromEntries(new FormData(form).entries());
    const details = [
      'NOUVELLE RESERVATION - LE MBONGUI BAR A JEUX',
      '',
      `Client : ${data.prenom} ${data.nom}`,
      `Telephone : ${data.telephone}`,
      `E-mail : ${data.email}`,
      `Reservation : ${data.type}`,
      `Personnes : ${data.personnes}`,
      `Date : ${data.date} a ${data.heure}`,
      `Message : ${data.message || '-'}`
    ].join('\n');
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(details)}`;
    const emailUrl = `mailto:${RESERVATION_EMAIL}?subject=${encodeURIComponent(`Reservation - ${data.prenom} ${data.nom}`)}&body=${encodeURIComponent(details)}`;
    window.open(whatsappUrl, '_blank', 'noopener');
    window.location.href = emailUrl;
    status.style.color = 'var(--lime)';
    status.textContent = 'Votre demande est prete : envoyez-la sur WhatsApp et par e-mail.';
    form.reset();
  });
});


