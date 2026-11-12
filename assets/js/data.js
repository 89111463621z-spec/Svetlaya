/*
 * Данные по лотам «Светлой Дачи».
 * Источник: Приложение № 1 к агентскому договору № СД-01/2026 от 26.10.2026
 * (Таблица 1 — земельные участки, Таблица 2 — объекты капстроительства).
 *
 * Правила:
 *  - цена дома в договоре уже включает землю под ним;
 *  - дуплекс = дом на двух хозяев → на сайте два лота «½ дуплекса»,
 *    цена каждого = цена дуплекса / 2;
 *  - дом без ремонта → опция «ремонт под ключ» за RENOVATION_PRICE.
 *
 * Номера участков 2–17 — по плану межевания (PDF из AutoCAD).
 * Участки 7–11 (по 800 м²) и 13–15 (по 1000 м²) одинаковы по площади,
 * поэтому их точные кадастровые номера на плане не привязаны.
 */
window.SITE = {
  name: 'Светлая Дача',
  phone: '+7 921 413-38-72',
  phoneHref: 'tel:+79214133872',
  renovationPrice: 2000000,
  // Ключ API Яндекс Карт (developer.tech.yandex.ru). Без ключа карта тоже работает,
  // но Яндекс рекомендует указать свой ключ.
  yandexMapsKey: '',
};

const Q = '47:03:1001001:';

window.PLOTS = {
  '2': { cad: Q + '625', area: 729, houses: [
    { kind: 'house', code: 'Д-09', cad: Q + '303', renov: true,  price: 6000000 },
    { kind: 'house', code: 'Д-10', cad: Q + '309', renov: false, price: 4000000 },
  ]},
  '3': { cad: Q + '624', area: 849, houses: [
    { kind: 'house', code: 'Д-07', cad: Q + '299', renov: true,  price: 6000000 },
    { kind: 'house', code: 'Д-08', cad: Q + '302', renov: false, price: 4000000 },
  ]},
  '4': { cad: Q + '623', area: 1054, houses: [
    { kind: 'house',  code: 'Д-06', cad: Q + '306', renov: true,  price: 6000000 },
    { kind: 'duplex', code: 'Д-05', cad: Q + '301', renov: false, price: 6000000 },
  ]},
  '5': { cad: Q + '622', area: 967, houses: [
    { kind: 'duplex', code: 'Д-03', cad: Q + '304', renov: true,  price: 9000000 },
    { kind: 'duplex', code: 'Д-04', cad: Q + '308', renov: false, price: 6000000 },
  ]},
  '6': { cad: Q + '621', area: 883, houses: [
    { kind: 'duplex', code: 'Д-01', cad: Q + '305', renov: false, price: 6000000 },
    { kind: 'duplex', code: 'Д-02', cad: Q + '307', renov: false, price: 6000000 },
  ]},
  '7':  { area: 800,  price: 1500000 },
  '8':  { area: 800,  price: 1500000 },
  '9':  { area: 800,  price: 1500000 },
  '10': { area: 800,  price: 1500000 },
  '11': { area: 800,  price: 1500000 },
  '12': { cad: Q + '635', area: 918,  price: 1600000 },
  '13': { area: 1000, price: 1700000 },
  '14': { area: 1000, price: 1700000 },
  '15': { area: 1000, price: 1700000 },
  '16': { cad: Q + '619', area: 915,  price: 1600000 },
  '17': { cad: Q + '620', area: 1200, price: 2000000 },
};

/* ==========================================================
   СТАТУСЫ ЛОТОВ — здесь отмечаем бронь и продажи.
   Ключ — код лота из шахматки (Д-01.1, Д-06, …) или номер участка на плане ('7', '12').
   Значения: 'reserved' — бронь, 'sold' — продан. Свободные лоты не указываем.
   Пример:  'Д-09': 'sold',  'Д-01.2': 'reserved',  '13': 'sold',
   ========================================================== */
window.STATUS = {
};

/* Участок из договора, которого нет на плане межевания */
window.EXTRA_PLOTS = [
  { id: '18', cad: Q + '626', area: 1136, price: 1500000, note: 'Расположение на плане уточняйте у менеджера' },
];

/* Разворачиваем в плоский список лотов */
window.buildLots = function () {
  const lots = [];
  for (const [plot, p] of Object.entries(window.PLOTS)) {
    if (p.houses) {
      p.houses.forEach((h, i) => {
        const letter = String.fromCharCode(1040 + i); // А, Б
        if (h.kind === 'duplex') {
          [1, 2].forEach((half) => lots.push({
            id: `${plot}-${letter}${half}`, code: `${h.code}.${half}`, house: i, half, plot, type: 'duplex', renov: h.renov,
            landShare: 4, landArea: Math.round(p.area / 4),
            price: h.price / 2, cad: h.cad, plotCad: p.cad, plotArea: p.area,
            title: `½ дуплекса ${h.renov ? 'с\u00a0ремонтом' : 'без\u00a0ремонта'}`,
          }));
        } else {
          lots.push({
            id: `${plot}-${letter}`, code: h.code, house: i, plot, type: 'house', renov: h.renov,
            landShare: 2, landArea: Math.round(p.area / 2),
            price: h.price, cad: h.cad, plotCad: p.cad, plotArea: p.area,
            title: `Дом ${h.renov ? 'с\u00a0ремонтом' : 'без\u00a0ремонта'}`,
          });
        }
      });
    } else {
      lots.push({
        id: plot, plot, type: 'land', price: p.price, plotCad: p.cad, plotArea: p.area,
        title: `Участок ${(p.area / 100).toLocaleString('ru-RU')} сот.`,
      });
    }
  }
  window.EXTRA_PLOTS.forEach((p) => lots.push({
    id: p.id, plot: null, type: 'land', price: p.price, plotCad: p.cad, plotArea: p.area,
    title: `Участок ${(p.area / 100).toLocaleString('ru-RU')} сот.`, note: p.note,
  }));
  const S = window.STATUS || {};
  lots.forEach((l) => { l.status = S[l.code] || S[l.id] || 'free'; });
  return lots;
};

/* Точка посёлка: Яндекс Карты, организация «Светлая Дача»,
   адрес «коттеджный посёлок Светлое Дача, 10/2», Мичуринское с.п.
   Время в пути — расчёт по данным OpenStreetMap (OSRM), без учёта пробок. */
window.LOCATION = {
  lat: 60.555521, lon: 29.809875, zoom: 11,
  /* метки на карте (координаты — Яндекс Карты) */
  points: [
    { name: '«Золотая Долина»', lat: 60.527755, lon: 29.767711, kind: 'ski' },
    { name: '«Снежный»', lat: 60.5243, lon: 29.7705, kind: 'ski' }, // у склонов курорта
    { name: '«Красное Озеро»', lat: 60.534397, lon: 29.738557, kind: 'ski' },
    { name: 'Мичуринское озеро', lat: 60.556427, lon: 29.891773, kind: 'lake' },
    { name: 'Ж/д станция Сосново', lat: 60.548609, lon: 30.215225, kind: 'rail', far: true },
  ],
  routes: [
    { name: 'Курорт «Золотая Долина»', time: '5', key: true },
    { name: 'Курорт «Снежный»', time: '7', key: true },
    { name: 'Курорт «Красное Озеро»', time: '8', key: true },
    { name: 'Мичуринское озеро', time: '10' },
    { name: 'Ж/д станция Сосново', time: '33' },
    { name: 'Санкт-Петербург, центр', time: '1,5', unit: 'ч' },
  ],
};

/* Рынок посуточной аренды (ноябрь 2026, открытые объявления) */
window.MARKET = {
  defaultRate: 7000,   // медиана за ночь в будни, дом на 4–6 человек
  defaultLoad: 35,     // предположение: данных о загрузке частных домов нет
  cards: [
    { value: '≈ 7 000 ₽', label: 'за ночь в будни: похожие домики на 4–6 гостей рядом с посёлком' },
    { value: '≈ 8 800 ₽', label: 'за ночь в выходные; летом и в праздники цены выше в 1,5–2 раза' },
    { value: 'от 14 000 ₽', label: 'за ночь в новогодние праздники у похожих домов; новогодняя ночь — дороже' },
    { value: 'от 70 000 ₽', label: 'в месяц: долгосрочная аренда похожего дома' },
    { value: '13 000 ₽', label: 'средняя посуточная цена загородного дома в Ленобласти, +5% за год (Циан, 2026)' },
  ],
  sources: 'Расчёт ориентировочный: основан на ценах посуточной аренды похожих домов в районе.',
};
