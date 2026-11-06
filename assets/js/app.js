/* Светлая Дача — интерактив */
(function () {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const SVGNS = 'http://www.w3.org/2000/svg';
  const LOTS = window.buildLots();
  const RENO = window.SITE.renovationPrice;

  /* ---------- форматирование ---------- */
  const mln = (v) => {
    const m = v / 1e6;
    return (Number.isInteger(m) ? m.toFixed(1) : String(+m.toFixed(2))).replace('.', ',') + ' млн ₽';
  };
  const rub = (v) => Math.round(v).toLocaleString('ru-RU') + ' ₽';
  const sot = (m2) => (m2 / 100).toLocaleString('ru-RU', { maximumFractionDigits: 2 }) + ' сот.';
  const shortCad = (c) => (c ? c.replace('47:03:1001001:', '…:') : '');

  /* ---------- минимальные цены и счётчики ---------- */
  const houseLots = LOTS.filter((l) => l.type !== 'land');
  const landLots = LOTS.filter((l) => l.type === 'land');
  const minH = Math.min(...houseLots.map((l) => l.price));
  const minL = Math.min(...landLots.map((l) => l.price));
  $$('[data-min="houses"]').forEach((el) => (el.textContent = String(minH / 1e6).replace('.', ',')));
  $$('[data-min="land"]').forEach((el) => (el.textContent = String(minL / 1e6).replace('.', ',')));
  $$('[data-count="lots"]').forEach((el) => (el.textContent = LOTS.length));

  /* ---------- фильтры ---------- */
  const FILTERS = {
    all: () => true,
    renov: (l) => l.type !== 'land' && l.renov,
    norenov: (l) => l.type !== 'land' && !l.renov,
    duplex: (l) => l.type === 'duplex',
    land: (l) => l.type === 'land',
  };
  let currentFilter = 'all';

  /* ======================================================
     ПЛАН ПОСЁЛКА (SVG)
     ====================================================== */
  const svg = $('#planSvg');
  const tip = $('#planTip');
  const G = window.PLAN_GEO;
  const el = (tag, attrs = {}, parent) => {
    const n = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
    if (parent) parent.appendChild(n);
    return n;
  };
  const pts = (arr) => arr.map((p) => p.join(',')).join(' ');
  const plotGroups = {};

  function lotsOfPlot(id) { return LOTS.filter((l) => l.plot === id); }

  function drawPlan() {
    svg.setAttribute('viewBox', `-10 -10 ${G.w + 20} ${G.h + 20}`);

    // мягкая тень под посёлком
    const defs = el('defs', {}, svg);
    const f = el('filter', { id: 'soft', x: '-10%', y: '-10%', width: '120%', height: '120%' }, defs);
    el('feDropShadow', { dx: 0, dy: 10, stdDeviation: 14, 'flood-color': '#000', 'flood-opacity': .45 }, f);

    const base = el('g', { filter: 'url(#soft)' }, svg);
    // общая зона (дороги, проезды) — номера 1.1 и 1.2 на плане межевания
    G.plots.filter((p) => !window.PLOTS[p.id]).forEach((p) => {
      el('polygon', { points: pts(p.pts), class: 'p-common' }, base);
    });
    // подложка-силуэт всех участков, чтобы между ними не было щелей
    G.plots.filter((p) => window.PLOTS[p.id]).forEach((p) => {
      el('polygon', { points: pts(p.pts), fill: '#1b2a25' }, base);
    });

    // ось главной улицы
    el('path', { d: 'M 30 413 L 640 413 L 640 610', class: 'p-road-axis' }, svg);
    const lbl = el('text', { x: 300, y: 418, class: 'p-label-common', 'text-anchor': 'middle' }, svg);
    lbl.textContent = 'улица';

    // участки
    G.plots.filter((p) => window.PLOTS[p.id]).forEach((p) => {
      const data = window.PLOTS[p.id];
      const lots = lotsOfPlot(p.id);
      const built = !!data.houses;
      const g = el('g', {
        class: `p-plot ${built ? 't-built' : 't-land'}${lots.some((l) => l.renov) ? ' has-renov' : ''}`,
        tabindex: 0, role: 'button', 'data-plot': p.id,
        'aria-label': `Участок ${p.id}, ${data.area} м²`,
      }, svg);
      el('polygon', { points: pts(p.pts), class: 'shape' }, g);

      // дома
      if (built) {
        p.houses.forEach((h, i) => {
          el('polygon', { points: pts(h), class: 'p-house' }, g);
          const isDuplex = p.hArea[i] > 4500; // пятно дуплекса ~75 м², дома ~45 м²
          if (isDuplex) {
            // делим дуплекс пополам по короткой оси
            const [a, b, c, d] = h;
            const len = (u, v) => Math.hypot(u[0] - v[0], u[1] - v[1]);
            const mid = (u, v) => [(u[0] + v[0]) / 2, (u[1] + v[1]) / 2];
            const [m1, m2] = len(a, b) > len(b, c) ? [mid(a, b), mid(c, d)] : [mid(b, c), mid(d, a)];
            el('line', { x1: m1[0], y1: m1[1], x2: m2[0], y2: m2[1], class: 'p-house-split' }, g);
          }
        });
      }

      // подписи
      const [cx, cy] = p.c;
      const num = el('text', { x: cx, y: built ? cy - 2 : cy - 8, class: 'p-num' }, g);
      num.textContent = p.id;
      if (!built) {
        const sub = el('text', { x: cx, y: cy + 12, class: 'p-sub' }, g);
        sub.textContent = sot(data.area);
        const pr = el('text', { x: cx, y: cy + 30, class: 'p-price' }, g);
        pr.textContent = mln(data.price);
      }

      g.addEventListener('click', () => selectPlot(p.id));
      g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectPlot(p.id); } });
      g.addEventListener('mousemove', (e) => showTip(e, p.id));
      g.addEventListener('mouseleave', () => (tip.hidden = true));
      plotGroups[p.id] = g;
    });
  }

  function showTip(e, id) {
    const lots = lotsOfPlot(id);
    const data = window.PLOTS[id];
    const min = Math.min(...lots.map((l) => l.price));
    const box = svg.parentElement.getBoundingClientRect();
    const what = data.houses ? `${lots.length} ${plural(lots.length, ['лот', 'лота', 'лотов'])}` : sot(data.area);
    tip.innerHTML = `Участок ${id} · ${what} · <b>от ${mln(min)}</b>`;
    tip.style.left = e.clientX - box.left + 'px';
    tip.style.top = e.clientY - box.top + 'px';
    tip.hidden = false;
  }

  function plural(n, f) {
    const a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return f[2];
    if (b > 1 && b < 5) return f[1];
    if (b === 1) return f[0];
    return f[2];
  }

  /* ---------- панель участка ---------- */
  const panel = $('#planPanel');
  const panelEmpty = panel.innerHTML;

  function lotCard(l) {
    const badge = l.type === 'land' ? '<span class="badge">Без дома</span>'
      : l.renov ? '<span class="badge badge--renov">С ремонтом</span>'
      : '<span class="badge">Без ремонта</span>';
    const alt = l.type === 'house' && !l.renov
      ? `<span class="lot__alt">С ремонтом под ключ: ${mln(l.price + RENO)}</span>`
      : l.type === 'duplex' && !l.renov
        ? '<span class="lot__alt">Ремонт по запросу, стоимость по запросу</span>' : '';
    const cad = l.cad ? `<span class="lot__cad">${l.type === 'duplex' ? '½ дома и ½ земли под ним · ' : ''}кад. № ${l.cad}</span>` : '';
    return `<div class="lot">
      <div class="lot__top"><span class="lot__name">${l.title}</span>${badge}</div>
      <span class="lot__price">${mln(l.price)}</span>${alt}${cad}
    </div>`;
  }

  function selectPlot(id) {
    Object.values(plotGroups).forEach((g) => g.classList.remove('is-active'));
    plotGroups[id]?.classList.add('is-active');
    const data = window.PLOTS[id];
    const lots = lotsOfPlot(id);
    const built = !!data.houses;
    const photo = built
      ? (lots.some((l) => l.renov) ? 'living-sm.jpg' : 'house-side-sm.jpg')
      : (data.area >= 1000 ? 'yard-sm.jpg' : 'street-winter-sm.jpg');
    const meta = built
      ? `Земля ${data.area} м² (${sot(data.area)}), кад. № <code>${data.cad}</code>.<br>Цена дома уже включает землю под ним.${lots.some((l) => l.type === 'duplex') ? ' Дуплекс делится на&nbsp;двух хозяев: каждому ½ дома и&nbsp;½ земли под ним.' : ''}<br>Дома 65–72&nbsp;м²: кухня-гостиная, 2&nbsp;спальни, 4+2 места.`
      : `${data.area} м² · ${(data.price / data.area * 100).toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽ за сотку${data.cad ? `<br>Кад. № <code>${data.cad}</code>` : '<br>Кадастровый номер&nbsp;— по запросу'}`;

    panel.innerHTML = `
      <div class="panel__title"><h3>Участок ${id}</h3><span class="badge">${built ? 'С домами' : 'Свободный'}</span></div>
      <p class="panel__meta">${meta}</p>
      <div class="panel__lots">${lots.map(lotCard).join('')}</div>
      ${lots.some((l) => l.type === 'house' && !l.renov) ? '<p class="note panel__note">Ремонт под ключ для дома без ремонта&nbsp;— 2&nbsp;млн&nbsp;₽. Заезжаете в&nbsp;готовый дом.</p>' : ''}
      ${lots.some((l) => l.type === 'duplex' && !l.renov) ? '<p class="note panel__note">Для половины дуплекса без ремонта сделаем ремонт по&nbsp;запросу, стоимость рассчитаем индивидуально.</p>' : ''}
      <div class="panel__photo"><img src="assets/img/${photo}" alt="" loading="lazy"></div>
      <div class="panel__actions">
        <button class="btn btn--light" data-open-callback data-lot="Участок ${id}">Узнать подробнее</button>
        <a class="btn btn--ghost" href="${window.SITE.phoneHref}">Позвонить: ${window.SITE.phone}</a>
      </div>`;
    if (window.matchMedia('(max-width: 1200px)').matches) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  /* ---------- таблица лотов ---------- */
  const body = $('#lotsBody');
  function drawTable() {
    body.innerHTML = LOTS.map((l) => {
      const color = l.type === 'land' ? 'var(--land)' : l.renov ? 'var(--renov)' : 'var(--norenov)';
      const land = l.type === 'land'
        ? `${sot(l.plotArea)}<span class="muted">${l.plotArea} м²</span>`
        : l.type === 'duplex'
          ? `½ земли под дуплексом<span class="muted">участок ${l.plotArea} м²</span>`
          : `земля под домом<span class="muted">участок ${l.plotArea} м²</span>`;
      const alt = l.type === 'house' && !l.renov ? `<small>с ремонтом ${mln(l.price + RENO)}</small>`
        : l.type === 'duplex' && !l.renov ? '<small>ремонт по запросу</small>' : '';
      const btn = l.plot
        ? `<button data-goto="${l.plot}">На плане</button>`
        : `<button data-open-callback data-lot="Участок ${l.plotArea} м² (${l.plotCad})">Узнать</button>`;
      return `<div class="lots__row" role="row" data-lot-id="${l.id}">
        <span role="cell">${l.plot ? `№ ${l.plot}` : '—'}</span>
        <span role="cell"><i class="dot" style="background:${color}"></i>${l.title}<span class="muted">${l.cad ? 'кад. № ' + shortCad(l.cad) : (l.note || (l.plotCad ? 'кад. № ' + shortCad(l.plotCad) : ''))}</span></span>
        <span role="cell">${land}</span>
        <span role="cell" class="price">${mln(l.price)}${alt}</span>
        <span role="cell">${btn}</span>
      </div>`;
    }).join('');
    $$('[data-goto]', body).forEach((b) => b.addEventListener('click', () => {
      selectPlot(b.dataset.goto);
      $('#plan').scrollIntoView({ behavior: 'smooth' });
    }));
  }

  function applyFilter(name) {
    currentFilter = name;
    $$('.chip').forEach((c) => c.classList.toggle('is-active', c.dataset.filter === name));
    const fn = FILTERS[name];
    let shown = 0;
    LOTS.forEach((l) => {
      const row = body.querySelector(`[data-lot-id="${l.id}"]`);
      const ok = fn(l);
      row.classList.toggle('is-hidden', !ok);
      if (ok) shown++;
    });
    Object.entries(plotGroups).forEach(([id, g]) => {
      g.classList.toggle('is-dim', !lotsOfPlot(id).some(fn));
    });
    $('#lotsCount').textContent = `${shown} ${plural(shown, ['лот', 'лота', 'лотов'])}`;
  }

  $$('.chip').forEach((c) => c.addEventListener('click', () => applyFilter(c.dataset.filter)));
  $$('[data-filter-link]').forEach((a) => a.addEventListener('click', () => applyFilter(a.dataset.filterLink)));

  /* ======================================================
     РАСПОЛОЖЕНИЕ
     ====================================================== */
  function drawLocation() {
    const L = window.LOCATION || {};
    const map = $('#ymap');
    if (L.lat && L.lon) {
      map.src = `https://yandex.ru/map-widget/v1/?ll=${L.lon}%2C${L.lat}&z=${L.zoom || 11}&pt=${L.lon}%2C${L.lat}%2Cpm2orgl&l=map`;
    } else {
      map.src = 'https://yandex.ru/map-widget/v1/?text=' + encodeURIComponent('Мичуринское, Приозерский район, Ленинградская область') + '&z=11';
    }
    const routes = L.routes || [];
    $('#routes').innerHTML = routes.map((r) => `
      <li class="${r.key ? 'is-key' : ''}"><span>${r.name}</span><b>${r.time}<small>${r.unit || 'мин'}</small></b></li>`).join('');
  }

  /* ======================================================
     КАЛЬКУЛЯТОР ДОХОДА
     ====================================================== */
  function calc() {
    const M = window.MARKET || {};
    const price = +$('#iPrice').value;
    const rate = +$('#iRate').value;
    const load = +$('#iLoad').value / 100;
    const cost = +$('#iCost').value / 100;
    const gross = rate * 365 * load;
    const net = gross * (1 - cost);
    $('#oPrice').textContent = mln(price);
    $('#oRate').textContent = rub(rate);
    $('#oLoad').textContent = `${Math.round(load * 100)}% · ${Math.round(365 * load)} ночей`;
    $('#oCost').textContent = `${Math.round(cost * 100)}% выручки`;
    $('#rYear').textContent = rub(net);
    $('#rMonth').textContent = rub(net / 12);
    $('#rYield').textContent = `${(net / price * 100).toFixed(1).replace('.', ',')}%`;
    const years = price / net;
    $('#rPayback').textContent = isFinite(years) ? `${years.toFixed(1).replace('.', ',')} ${plural(Math.round(years), ['год', 'года', 'лет'])}` : '—';
  }
  function initCalc() {
    const M = window.MARKET || {};
    if (M.defaultRate) $('#iRate').value = M.defaultRate;
    if (M.defaultLoad) $('#iLoad').value = M.defaultLoad;
    ['#iPrice', '#iRate', '#iLoad', '#iCost'].forEach((s) => $(s).addEventListener('input', calc));
    calc();
    if (M.cards) {
      $('#market').innerHTML = M.cards.map((c) => `<div class="market__item"><b>${c.value}</b><span>${c.label}</span></div>`).join('')
        + (M.sources ? `<p class="market__src">Источники: ${M.sources}</p>` : '');
    }
  }

  /* ======================================================
     ГАЛЕРЕЯ
     ====================================================== */
  // [файл, подпись, раскладка: '' | 'tall' | 'wide']
  const GALLERY = [
    ['street-winter', 'Улица посёлка зимой', 'wide'], ['living', 'Гостиная', 'tall'], ['kitchen', 'Кухня', 'tall'],
    ['evening', 'Вечер в посёлке', 'wide'], ['bedroom', 'Спальня', 'tall'], ['house-side', 'Дом среди сосен', 'tall'],
    ['sauna', 'Интерьер', 'wide'], ['bath', 'Санузел', ''], ['stairs', 'Лестница на мансарду', ''],
    ['yard', 'Двор и детская площадка', 'wide'], ['attic-bedroom', 'Спальня в мансарде', ''], ['living-2', 'Гостиная', 'tall'],
    ['hall', 'Прихожая', 'tall'], ['shower', 'Душевая', ''], ['house-back', 'Дом зимой', ''],
    ['kids', 'Детская', ''], ['desk', 'Рабочее место', ''], ['door', 'Крыльцо', 'wide'], ['sauna-3', 'Интерьер', ''],
  ];
  function drawGallery() {
    $('#galleryGrid').innerHTML = GALLERY.map(([f, alt, cls]) =>
      `<button class="${cls}" data-full="assets/img/${f}.jpg"><img src="assets/img/${f}-sm.jpg" alt="${alt}" loading="lazy"></button>`).join('');
    const lb = $('#lightbox'), img = $('img', lb);
    $$('#galleryGrid button').forEach((b) => b.addEventListener('click', () => {
      img.src = b.dataset.full; img.alt = $('img', b).alt; lb.hidden = false;
    }));
    lb.addEventListener('click', () => (lb.hidden = true));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') lb.hidden = true; });
  }

  /* ======================================================
     ФОРМЫ И МОДАЛКА
     ====================================================== */
  /* Форма заявки — CRM-форма Битрикс24 (одна на странице).
     По кнопке «Заказать звонок» переносим её в окно, при закрытии — обратно. */
  const modal = $('#callback');
  const b24Wrap = $('#b24Wrap');
  const b24Home = $('#b24Home');
  const b24Modal = $('#b24Modal');
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-open-callback]');
    if (!t) return;
    e.preventDefault();
    const lot = t.dataset.lot || '';
    $('#cbTitle').innerHTML = lot ? `${lot}: расскажем подробно` : 'Перезвоним вам';
    b24Modal.appendChild(b24Wrap);
    modal.showModal();
  });
  modal.addEventListener('close', () => b24Home.appendChild(b24Wrap));

  /* ---------- меню ---------- */
  const burger = $('[data-burger]'), nav = $('.nav');
  burger.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', open);
  });
  $$('.nav a').forEach((a) => a.addEventListener('click', () => { nav.classList.remove('is-open'); burger.setAttribute('aria-expanded', false); }));

  /* ---------- появление при скролле ---------- */
  function reveal() {
    const items = $$('.section__head, .fact, .pill, .manage, .scenario, .routes li, .calc, .formula, .renovation__photos, .gallery__grid button, .cta > *, .plan__wrap');
    items.forEach((i) => i.classList.add('reveal'));
    if (!('IntersectionObserver' in window)) { items.forEach((i) => i.classList.add('is-in')); return; }
    const io = new IntersectionObserver((ents) => ents.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    items.forEach((i) => io.observe(i));
  }

  /* ---------- старт ---------- */
  drawPlan();
  drawTable();
  applyFilter('all');
  drawLocation();
  initCalc();
  drawGallery();
  reveal();
})();
