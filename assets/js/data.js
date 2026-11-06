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
  whatsapp: 'https://wa.me/79214133872',
  renovationPrice: 2000000,
};

const Q = '47:03:1001001:';

window.PLOTS = {
  '2': { cad: Q + '625', area: 729, houses: [
    { kind: 'house', cad: Q + '303', renov: true,  price: 6000000 },
    { kind: 'house', cad: Q + '309', renov: false, price: 4000000 },
  ]},
  '3': { cad: Q + '624', area: 849, houses: [
    { kind: 'house', cad: Q + '299', renov: true,  price: 6000000 },
    { kind: 'house', cad: Q + '302', renov: false, price: 4000000 },
  ]},
  '4': { cad: Q + '623', area: 1054, houses: [
    { kind: 'house',  cad: Q + '306', renov: true,  price: 6000000 },
    { kind: 'duplex', cad: Q + '301', renov: false, price: 6000000 },
  ]},
  '5': { cad: Q + '622', area: 967, houses: [
    { kind: 'duplex', cad: Q + '304', renov: true,  price: 9000000 },
    { kind: 'duplex', cad: Q + '308', renov: false, price: 6000000 },
  ]},
  '6': { cad: Q + '621', area: 883, houses: [
    { kind: 'duplex', cad: Q + '305', renov: false, price: 6000000 },
    { kind: 'duplex', cad: Q + '307', renov: false, price: 6000000 },
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
            id: `${plot}-${letter}${half}`, plot, type: 'duplex', renov: h.renov,
            price: h.price / 2, cad: h.cad, plotCad: p.cad, plotArea: p.area,
            title: `½ дуплекса ${h.renov ? 'с\u00a0ремонтом' : 'без\u00a0ремонта'}`,
          }));
        } else {
          lots.push({
            id: `${plot}-${letter}`, plot, type: 'house', renov: h.renov,
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
  return lots;
};
