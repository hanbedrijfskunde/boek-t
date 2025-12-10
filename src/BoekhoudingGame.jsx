import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// ============================================================
// BEDRIJVEN DATABASE - Met dynamische bedragen in tekst
// ============================================================

const bedrijven = [
  {
    id: 'koffiebar',
    naam: 'Koffiebar Roasted',
    emoji: '☕',
    beschrijving: 'Een gezellige koffiebar in het centrum',
    kleur: 'pink',
    openingsBalans: {
      vasteActiva: 4500,
      voorraad: 2000,
      debiteuren: 0,
      bank: 8000,
      kas: 500,
      eigenVermogen: 10000,
      lening: 5000,
      crediteuren: 0,
      vooruitontvangen: 0
    },
    transacties: [
      {
        datum: "2 januari",
        getOmschrijving: (b) => `Roasted verkoopt koffie en gebak aan een bedrijf voor €${b.verkoop.toLocaleString()}.`,
        getDetail: (b) => `De kostprijs van de producten is €${b.kostprijs.toLocaleString()}. Het bedrijf betaalt later.`,
        bedragen: { verkoop: 600, kostprijs: 200 },
        correctePosten: ["debiteuren", "voorraad", "eigenVermogen"],
        getMutaties: (b) => ({ debiteuren: b.verkoop, voorraad: -b.kostprijs, eigenVermogen: b.verkoop - b.kostprijs }),
        resultaat: (b) => ({ opbrengsten: b.verkoop, kostprijs: b.kostprijs }),
        liquiditeit: {},
        hints: [
          "Er gaat geen geld de deur uit. Wie moet er nog betalen aan Roasted?",
          "Debiteuren stijgen, voorraad daalt, eigen vermogen stijgt met de winst.",
          "Debiteuren +verkoopbedrag, Voorraad -kostprijs, EV +winst"
        ],
        kernprincipe: "OPBRENGST maar geen ONTVANGST — er is geen geld binnengekomen!"
      },
      {
        datum: "5 januari",
        getOmschrijving: (b) => `Het bedrijf betaalt de factuur van €${b.betaling.toLocaleString()}.`,
        getDetail: () => "Het geld wordt bijgeschreven op de bankrekening.",
        bedragen: { betaling: 600 },
        linkedBedragen: {
          betaling: { type: 'transaction', txIndex: 0, key: 'verkoop' }
        },
        correctePosten: ["bank", "debiteuren"],
        getMutaties: (b) => ({ bank: b.betaling, debiteuren: -b.betaling }),
        resultaat: {},
        liquiditeit: (b) => ({ ontvangsten: b.betaling }),
        hints: [
          "Nu komt het geld binnen. Verandert de winst?",
          "Bank stijgt, debiteuren dalen.",
          "Bank +bedrag, Debiteuren -bedrag"
        ],
        kernprincipe: "ONTVANGST maar geen OPBRENGST — de winst was al geboekt!"
      },
      {
        datum: "8 januari",
        getOmschrijving: (b) => `Roasted koopt koffiebonen bij de groothandel voor €${b.inkoop.toLocaleString()}.`,
        getDetail: () => "Betaling over 30 dagen.",
        bedragen: { inkoop: 1500 },
        correctePosten: ["voorraad", "crediteuren"],
        getMutaties: (b) => ({ voorraad: b.inkoop, crediteuren: b.inkoop }),
        resultaat: {},
        liquiditeit: {},
        hints: [
          "Roasted betaalt nog niet. Wat krijgt ze wel? En aan wie heeft ze nu een schuld?",
          "Voorraad groeit, crediteuren groeien.",
          "Voorraad +bedrag, Crediteuren +bedrag"
        ],
        kernprincipe: "Inkoop op rekening: voorraad stijgt, schuld stijgt, maar geen uitgave!"
      },
      {
        datum: "12 januari",
        getOmschrijving: (b) => `Roasted betaalt de groothandel €${b.betaling.toLocaleString()}.`,
        getDetail: () => "Ze maakt het bedrag over via de bank.",
        bedragen: { betaling: 1500 },
        linkedBedragen: {
          betaling: { type: 'transaction', txIndex: 2, key: 'inkoop' }
        },
        correctePosten: ["bank", "crediteuren"],
        getMutaties: (b) => ({ bank: -b.betaling, crediteuren: -b.betaling }),
        resultaat: {},
        liquiditeit: (b) => ({ uitgaven: b.betaling }),
        hints: [
          "Geld gaat weg. Is dit een kost? Nee! De voorraad was al geboekt.",
          "Bank daalt, crediteuren dalen.",
          "Bank -bedrag, Crediteuren -bedrag"
        ],
        kernprincipe: "UITGAVE maar geen KOST — de inkoop was al geboekt!"
      },
      {
        datum: "18 januari",
        getOmschrijving: (b) => `Roasted lost €${b.aflossing.toLocaleString()} van haar lening af.`,
        getDetail: () => "Het bedrag wordt afgeschreven van de bankrekening.",
        bedragen: { aflossing: 1000 },
        correctePosten: ["bank", "lening"],
        getMutaties: (b) => ({ bank: -b.aflossing, lening: -b.aflossing }),
        resultaat: {},
        liquiditeit: (b) => ({ uitgaven: b.aflossing }),
        hints: [
          "Is aflossen een kost? NEE! Je betaalt alleen een schuld terug.",
          "Bank daalt, lening daalt.",
          "Bank -bedrag, Lening -bedrag"
        ],
        kernprincipe: "Aflossen is GEEN kost! Je ruilt geld voor minder schuld."
      },
      {
        datum: "25 januari",
        getOmschrijving: (b) => `Roasted boekt de maandelijkse afschrijving van €${b.afschrijving.toLocaleString()} op de koffiemachine.`,
        getDetail: () => "De machine wordt minder waard door slijtage.",
        bedragen: { afschrijving: 150 },
        correctePosten: ["vasteActiva", "eigenVermogen"],
        getMutaties: (b) => ({ vasteActiva: -b.afschrijving, eigenVermogen: -b.afschrijving }),
        resultaat: (b) => ({ afschrijving: b.afschrijving }),
        liquiditeit: {},
        hints: [
          "Gaat er geld de deur uit? Nee! Maar de waarde daalt wel.",
          "Vaste activa dalen, eigen vermogen daalt.",
          "Vaste activa -bedrag, Eigen vermogen -bedrag"
        ],
        kernprincipe: "Afschrijving is een KOST maar geen UITGAVE — er gaat geen geld de deur uit!"
      },
      {
        datum: "31 januari",
        getOmschrijving: (b) => `Roasted betaalt €${b.rente.toLocaleString()} rente over de lening.`,
        getDetail: () => "Dit wordt afgeschreven van de bankrekening.",
        bedragen: { rente: 50 },
        correctePosten: ["bank", "eigenVermogen"],
        getMutaties: (b) => ({ bank: -b.rente, eigenVermogen: -b.rente }),
        resultaat: (b) => ({ rente: b.rente }),
        liquiditeit: (b) => ({ uitgaven: b.rente }),
        hints: [
          "Rente is wél een kost. En er gaat ook geld de deur uit.",
          "Bank daalt, eigen vermogen daalt.",
          "Bank -bedrag, Eigen vermogen -bedrag"
        ],
        kernprincipe: "Rente is zowel een KOST als een UITGAVE!"
      }
    ]
  },
  {
    id: 'supermarkt',
    naam: 'SuperFresh',
    emoji: '🛒',
    beschrijving: 'Een buurtsuper met dagverse producten',
    kleur: 'green',
    openingsBalans: {
      vasteActiva: 25000,
      voorraad: 15000,
      debiteuren: 0,
      bank: 20000,
      kas: 2000,
      eigenVermogen: 40000,
      lening: 20000,
      crediteuren: 2000,
      vooruitontvangen: 0
    },
    transacties: [
      {
        datum: "3 januari",
        getOmschrijving: (b) => `Een horecazaak koopt voor €${b.verkoop.toLocaleString()} aan producten op rekening.`,
        getDetail: (b) => `Kostprijs: €${b.kostprijs.toLocaleString()}. Betaling binnen 14 dagen.`,
        bedragen: { verkoop: 2400, kostprijs: 1800 },
        correctePosten: ["debiteuren", "voorraad", "eigenVermogen"],
        getMutaties: (b) => ({ debiteuren: b.verkoop, voorraad: -b.kostprijs, eigenVermogen: b.verkoop - b.kostprijs }),
        resultaat: (b) => ({ opbrengsten: b.verkoop, kostprijs: b.kostprijs }),
        liquiditeit: {},
        hints: [
          "De horecazaak betaalt later. Wat verandert er nu al?",
          "Debiteuren stijgen, voorraad daalt, winst naar EV.",
          "Debiteuren +verkoop, Voorraad -kostprijs, EV +winst"
        ],
        kernprincipe: "Verkoop op rekening: OPBRENGST maar nog geen ONTVANGST!"
      },
      {
        datum: "7 januari",
        getOmschrijving: (b) => `De horecazaak betaalt de factuur van €${b.betaling.toLocaleString()}.`,
        getDetail: () => "Het geld komt binnen op de bank.",
        bedragen: { betaling: 2400 },
        linkedBedragen: {
          betaling: { type: 'transaction', txIndex: 0, key: 'verkoop' }
        },
        correctePosten: ["bank", "debiteuren"],
        getMutaties: (b) => ({ bank: b.betaling, debiteuren: -b.betaling }),
        resultaat: {},
        liquiditeit: (b) => ({ ontvangsten: b.betaling }),
        hints: [
          "Nu pas komt het geld binnen.",
          "Bank omhoog, debiteuren omlaag.",
          "Bank +bedrag, Debiteuren -bedrag"
        ],
        kernprincipe: "ONTVANGST zonder OPBRENGST — de winst was al geboekt!"
      },
      {
        datum: "10 januari",
        getOmschrijving: (b) => `SuperFresh ontvangt een levering van de groothandel ter waarde van €${b.inkoop.toLocaleString()}.`,
        getDetail: () => "Betaling binnen 30 dagen.",
        bedragen: { inkoop: 8000 },
        correctePosten: ["voorraad", "crediteuren"],
        getMutaties: (b) => ({ voorraad: b.inkoop, crediteuren: b.inkoop }),
        resultaat: {},
        liquiditeit: {},
        hints: [
          "Voorraad komt binnen, maar er gaat nog geen geld uit.",
          "Voorraad stijgt, schuld aan leverancier stijgt.",
          "Voorraad +bedrag, Crediteuren +bedrag"
        ],
        kernprincipe: "Inkoop op rekening: geen uitgave, wel een schuld!"
      },
      {
        datum: "15 januari",
        getOmschrijving: (b) => `SuperFresh betaalt de oude schuld van €${b.betaling.toLocaleString()} aan de leverancier.`,
        getDetail: () => "Overboeking via de bank.",
        bedragen: { betaling: 2000 },
        linkedBedragen: {
          betaling: { type: 'opening', account: 'crediteuren' }
        },
        correctePosten: ["bank", "crediteuren"],
        getMutaties: (b) => ({ bank: -b.betaling, crediteuren: -b.betaling }),
        resultaat: {},
        liquiditeit: (b) => ({ uitgaven: b.betaling }),
        hints: [
          "De schuld wordt afgelost. Is dit een kost?",
          "Bank daalt, crediteuren dalen.",
          "Bank -bedrag, Crediteuren -bedrag"
        ],
        kernprincipe: "UITGAVE maar geen KOST — de inkoop was eerder al geboekt!"
      },
      {
        datum: "20 januari",
        getOmschrijving: (b) => `SuperFresh lost €${b.aflossing.toLocaleString()} van de lening af.`,
        getDetail: () => "Afgeschreven van de bank.",
        bedragen: { aflossing: 2000 },
        correctePosten: ["bank", "lening"],
        getMutaties: (b) => ({ bank: -b.aflossing, lening: -b.aflossing }),
        resultaat: {},
        liquiditeit: (b) => ({ uitgaven: b.aflossing }),
        hints: [
          "Aflossen is geen kost!",
          "Bank daalt, lening daalt.",
          "Bank -bedrag, Lening -bedrag"
        ],
        kernprincipe: "Aflossen is GEEN kost — je ruilt geld voor minder schuld."
      },
      {
        datum: "28 januari",
        getOmschrijving: (b) => `Afschrijving op de winkelinventaris: €${b.afschrijving.toLocaleString()}.`,
        getDetail: () => "Maandelijkse waardevermindering.",
        bedragen: { afschrijving: 400 },
        correctePosten: ["vasteActiva", "eigenVermogen"],
        getMutaties: (b) => ({ vasteActiva: -b.afschrijving, eigenVermogen: -b.afschrijving }),
        resultaat: (b) => ({ afschrijving: b.afschrijving }),
        liquiditeit: {},
        hints: [
          "Afschrijving: gaat er geld de deur uit?",
          "Vaste activa dalen, EV daalt.",
          "Vaste activa -bedrag, EV -bedrag"
        ],
        kernprincipe: "Afschrijving is een KOST maar geen UITGAVE!"
      },
      {
        datum: "31 januari",
        getOmschrijving: (b) => `Rentebetaling van €${b.rente.toLocaleString()} over de lening.`,
        getDetail: () => "Afgeschreven van de bank.",
        bedragen: { rente: 150 },
        correctePosten: ["bank", "eigenVermogen"],
        getMutaties: (b) => ({ bank: -b.rente, eigenVermogen: -b.rente }),
        resultaat: (b) => ({ rente: b.rente }),
        liquiditeit: (b) => ({ uitgaven: b.rente }),
        hints: [
          "Rente is een kost én een uitgave.",
          "Bank daalt, EV daalt.",
          "Bank -bedrag, EV -bedrag"
        ],
        kernprincipe: "Rente is zowel KOST als UITGAVE!"
      }
    ]
  },
  {
    id: 'catering',
    naam: 'Smakelijk Catering',
    emoji: '🍽️',
    beschrijving: 'Catering voor bedrijfsevenementen en feesten',
    kleur: 'orange',
    openingsBalans: {
      vasteActiva: 8000,
      voorraad: 3000,
      debiteuren: 1500,
      bank: 12000,
      kas: 500,
      eigenVermogen: 18000,
      lening: 6000,
      crediteuren: 1000,
      vooruitontvangen: 0
    },
    transacties: [
      {
        datum: "4 januari",
        getOmschrijving: (b) => `Een bedrijf boekt catering voor hun nieuwjaarsborrel. Ze betalen €${b.vooruitbetaling.toLocaleString()} vooruit (50%).`,
        getDetail: () => "De rest volgt na het event.",
        bedragen: { vooruitbetaling: 1500 },
        correctePosten: ["bank", "vooruitontvangen"],
        getMutaties: (b) => ({ bank: b.vooruitbetaling, vooruitontvangen: b.vooruitbetaling }),
        resultaat: {},
        liquiditeit: (b) => ({ ontvangsten: b.vooruitbetaling }),
        hints: [
          "Het geld is binnen, maar het event is nog niet geweest. Is dit al opbrengst?",
          "Bank stijgt, maar je hebt een verplichting (vooruitontvangen bedragen).",
          "Bank +bedrag, Vooruitontvangen +bedrag"
        ],
        kernprincipe: "Vooruitbetaling is ONTVANGST maar nog geen OPBRENGST — je moet nog leveren!"
      },
      {
        datum: "10 januari",
        getOmschrijving: (b) => `Het cateringevent vindt plaats. Totale waarde: €${b.totaal.toLocaleString()}.`,
        getDetail: (b) => `Kostprijs ingrediënten: €${b.kostprijs.toLocaleString()}. De helft (€${b.vooruit.toLocaleString()}) was al vooruitbetaald.`,
        bedragen: { totaal: 3000, kostprijs: 1200, vooruit: 1500 },
        linkedBedragen: {
          vooruit: { type: 'transaction', txIndex: 0, key: 'vooruitbetaling' }
        },
        correctePosten: ["debiteuren", "voorraad", "eigenVermogen", "vooruitontvangen"],
        getMutaties: (b) => ({ debiteuren: b.totaal - b.vooruit, voorraad: -b.kostprijs, eigenVermogen: b.totaal - b.kostprijs, vooruitontvangen: -b.vooruit }),
        resultaat: (b) => ({ opbrengsten: b.totaal, kostprijs: b.kostprijs }),
        liquiditeit: {},
        hints: [
          "Nu is de prestatie geleverd. De vooruitbetaling wordt opbrengst, de rest wordt debiteur.",
          "Debiteuren +restant, Voorraad -kostprijs, EV +winst, Vooruitontvangen -vooruitbetaling.",
          "Vier posten muteren bij deze complexe transactie!"
        ],
        kernprincipe: "Bij levering wordt vooruitbetaling omgezet in opbrengst!"
      },
      {
        datum: "15 januari",
        getOmschrijving: (b) => `De klant betaalt het resterende bedrag van €${b.betaling.toLocaleString()}.`,
        getDetail: () => "Overgemaakt naar de bank.",
        bedragen: { betaling: 1500 },
        linkedBedragen: {
          betaling: { type: 'transaction', txIndex: 1, key: 'totaal', subtract: 'vooruit' }
        },
        correctePosten: ["bank", "debiteuren"],
        getMutaties: (b) => ({ bank: b.betaling, debiteuren: -b.betaling }),
        resultaat: {},
        liquiditeit: (b) => ({ ontvangsten: b.betaling }),
        hints: [
          "Het restant komt binnen.",
          "Bank stijgt, debiteuren dalen.",
          "Bank +bedrag, Debiteuren -bedrag"
        ],
        kernprincipe: "ONTVANGST zonder OPBRENGST!"
      },
      {
        datum: "18 januari",
        getOmschrijving: (b) => `Smakelijk koopt ingrediënten voor €${b.inkoop.toLocaleString()} bij de groothandel.`,
        getDetail: () => "Betaling binnen 14 dagen.",
        bedragen: { inkoop: 2500 },
        correctePosten: ["voorraad", "crediteuren"],
        getMutaties: (b) => ({ voorraad: b.inkoop, crediteuren: b.inkoop }),
        resultaat: {},
        liquiditeit: {},
        hints: [
          "Voorraad komt binnen, betaling later.",
          "Voorraad stijgt, crediteuren stijgen.",
          "Voorraad +bedrag, Crediteuren +bedrag"
        ],
        kernprincipe: "Inkoop op rekening: geen uitgave!"
      },
      {
        datum: "20 januari",
        getOmschrijving: (b) => `Smakelijk betaalt de oude schuld van €${b.betaling.toLocaleString()} aan leveranciers.`,
        getDetail: () => "Via de bank.",
        bedragen: { betaling: 1000 },
        linkedBedragen: {
          betaling: { type: 'opening', account: 'crediteuren' }
        },
        correctePosten: ["bank", "crediteuren"],
        getMutaties: (b) => ({ bank: -b.betaling, crediteuren: -b.betaling }),
        resultaat: {},
        liquiditeit: (b) => ({ uitgaven: b.betaling }),
        hints: [
          "Schuld wordt afgelost.",
          "Bank daalt, crediteuren dalen.",
          "Bank -bedrag, Crediteuren -bedrag"
        ],
        kernprincipe: "UITGAVE maar geen KOST!"
      },
      {
        datum: "28 januari",
        getOmschrijving: (b) => `Afschrijving op de cateringapparatuur: €${b.afschrijving.toLocaleString()}.`,
        getDetail: () => "Maandelijkse afschrijving.",
        bedragen: { afschrijving: 200 },
        correctePosten: ["vasteActiva", "eigenVermogen"],
        getMutaties: (b) => ({ vasteActiva: -b.afschrijving, eigenVermogen: -b.afschrijving }),
        resultaat: (b) => ({ afschrijving: b.afschrijving }),
        liquiditeit: {},
        hints: [
          "Waardevermindering van apparatuur.",
          "Vaste activa dalen, EV daalt.",
          "VA -bedrag, EV -bedrag"
        ],
        kernprincipe: "Afschrijving is KOST maar geen UITGAVE!"
      },
      {
        datum: "31 januari",
        getOmschrijving: (b) => `Rentebetaling van €${b.rente.toLocaleString()} over de lening.`,
        getDetail: () => "Afgeschreven van de bank.",
        bedragen: { rente: 45 },
        correctePosten: ["bank", "eigenVermogen"],
        getMutaties: (b) => ({ bank: -b.rente, eigenVermogen: -b.rente }),
        resultaat: (b) => ({ rente: b.rente }),
        liquiditeit: (b) => ({ uitgaven: b.rente }),
        hints: [
          "Rente is kost én uitgave.",
          "Bank daalt, EV daalt.",
          "Bank -bedrag, EV -bedrag"
        ],
        kernprincipe: "Rente is KOST én UITGAVE!"
      }
    ]
  },
  {
    id: 'schilder',
    naam: 'Schilder Jansen',
    emoji: '🖌️',
    beschrijving: 'Schildersbedrijf voor particulieren en bedrijven',
    kleur: 'blue',
    openingsBalans: {
      vasteActiva: 6000,
      voorraad: 2500,
      debiteuren: 3000,
      bank: 8000,
      kas: 500,
      eigenVermogen: 15000,
      lening: 4000,
      crediteuren: 1000,
      vooruitontvangen: 0
    },
    transacties: [
      {
        datum: "5 januari",
        getOmschrijving: (b) => `Jansen voltooit een schilderklus voor een kantoor. Factuur: €${b.verkoop.toLocaleString()}.`,
        getDetail: (b) => `Gebruikte verf: €${b.kostprijs.toLocaleString()}. Betaling binnen 30 dagen.`,
        bedragen: { verkoop: 4500, kostprijs: 800 },
        correctePosten: ["debiteuren", "voorraad", "eigenVermogen"],
        getMutaties: (b) => ({ debiteuren: b.verkoop, voorraad: -b.kostprijs, eigenVermogen: b.verkoop - b.kostprijs }),
        resultaat: (b) => ({ opbrengsten: b.verkoop, kostprijs: b.kostprijs }),
        liquiditeit: {},
        hints: [
          "De klus is klaar, factuur verstuurd. Wanneer is de opbrengst?",
          "Debiteuren stijgen, voorraad (verf) daalt, winst naar EV.",
          "Debiteuren +verkoop, Voorraad -kostprijs, EV +winst"
        ],
        kernprincipe: "OPBRENGST bij levering, niet bij betaling!"
      },
      {
        datum: "12 januari",
        getOmschrijving: (b) => `Een oude klant betaalt een openstaande factuur van €${b.betaling.toLocaleString()}.`,
        getDetail: () => "Overgemaakt naar de bank.",
        bedragen: { betaling: 3000 },
        linkedBedragen: {
          betaling: { type: 'opening', account: 'debiteuren' }
        },
        correctePosten: ["bank", "debiteuren"],
        getMutaties: (b) => ({ bank: b.betaling, debiteuren: -b.betaling }),
        resultaat: {},
        liquiditeit: (b) => ({ ontvangsten: b.betaling }),
        hints: [
          "Geld komt binnen van een oude debiteur.",
          "Bank stijgt, debiteuren dalen.",
          "Bank +bedrag, Debiteuren -bedrag"
        ],
        kernprincipe: "ONTVANGST zonder OPBRENGST!"
      },
      {
        datum: "15 januari",
        getOmschrijving: (b) => `Jansen koopt verf en materialen voor €${b.inkoop.toLocaleString()} bij de bouwmarkt.`,
        getDetail: () => "Op rekening.",
        bedragen: { inkoop: 1800 },
        correctePosten: ["voorraad", "crediteuren"],
        getMutaties: (b) => ({ voorraad: b.inkoop, crediteuren: b.inkoop }),
        resultaat: {},
        liquiditeit: {},
        hints: [
          "Materiaal komt binnen, betaling later.",
          "Voorraad stijgt, crediteuren stijgen.",
          "Voorraad +bedrag, Crediteuren +bedrag"
        ],
        kernprincipe: "Inkoop op rekening!"
      },
      {
        datum: "20 januari",
        getOmschrijving: (b) => `Jansen betaalt €${b.betaling.toLocaleString()} aan de bouwmarkt.`,
        getDetail: () => "Via de bank.",
        bedragen: { betaling: 1000 },
        correctePosten: ["bank", "crediteuren"],
        getMutaties: (b) => ({ bank: -b.betaling, crediteuren: -b.betaling }),
        resultaat: {},
        liquiditeit: (b) => ({ uitgaven: b.betaling }),
        hints: [
          "Schuld wordt betaald.",
          "Bank daalt, crediteuren dalen.",
          "Bank -bedrag, Crediteuren -bedrag"
        ],
        kernprincipe: "UITGAVE maar geen KOST!"
      },
      {
        datum: "23 januari",
        getOmschrijving: (b) => `Jansen koopt een nieuwe spuitapparaat voor €${b.investering.toLocaleString()}.`,
        getDetail: () => "Contant betaald via de bank.",
        bedragen: { investering: 2000 },
        correctePosten: ["vasteActiva", "bank"],
        getMutaties: (b) => ({ vasteActiva: b.investering, bank: -b.investering }),
        resultaat: {},
        liquiditeit: (b) => ({ uitgaven: b.investering }),
        hints: [
          "Apparatuur is een vast actief.",
          "Vaste activa stijgen, bank daalt.",
          "VA +bedrag, Bank -bedrag"
        ],
        kernprincipe: "Investering is geen kost!"
      },
      {
        datum: "28 januari",
        getOmschrijving: (b) => `Afschrijving op busje en gereedschap: €${b.afschrijving.toLocaleString()}.`,
        getDetail: () => "Maandelijkse afschrijving.",
        bedragen: { afschrijving: 250 },
        correctePosten: ["vasteActiva", "eigenVermogen"],
        getMutaties: (b) => ({ vasteActiva: -b.afschrijving, eigenVermogen: -b.afschrijving }),
        resultaat: (b) => ({ afschrijving: b.afschrijving }),
        liquiditeit: {},
        hints: [
          "Waardevermindering.",
          "VA dalen, EV daalt.",
          "VA -bedrag, EV -bedrag"
        ],
        kernprincipe: "Afschrijving is KOST maar geen UITGAVE!"
      },
      {
        datum: "31 januari",
        getOmschrijving: (b) => `Aflossing €${b.aflossing.toLocaleString()} en rente €${b.rente.toLocaleString()} op de lening.`,
        getDetail: () => "Afgeschreven van de bank.",
        bedragen: { aflossing: 500, rente: 30 },
        correctePosten: ["bank", "lening", "eigenVermogen"],
        getMutaties: (b) => ({ bank: -(b.aflossing + b.rente), lening: -b.aflossing, eigenVermogen: -b.rente }),
        resultaat: (b) => ({ rente: b.rente }),
        liquiditeit: (b) => ({ uitgaven: b.aflossing + b.rente }),
        hints: [
          "Aflossing is geen kost, rente wel!",
          "Bank daalt met totaal, lening daalt met aflossing, EV daalt met rente.",
          "Bank -(aflossing+rente), Lening -aflossing, EV -rente"
        ],
        kernprincipe: "Aflossing ≠ kost, Rente = kost!"
      }
    ]
  },
  {
    id: 'webshop',
    naam: 'WebShop24',
    emoji: '🛍️',
    beschrijving: 'Online shop voor elektronica en gadgets',
    kleur: 'purple',
    openingsBalans: {
      vasteActiva: 3000,
      voorraad: 25000,
      debiteuren: 0,
      bank: 15000,
      kas: 0,
      eigenVermogen: 30000,
      lening: 10000,
      crediteuren: 3000,
      vooruitontvangen: 0
    },
    transacties: [
      {
        datum: "2 januari",
        getOmschrijving: (b) => `Klanten plaatsen bestellingen en betalen €${b.verkoop.toLocaleString()} via iDEAL.`,
        getDetail: (b) => `Kostprijs van de producten: €${b.kostprijs.toLocaleString()}.`,
        bedragen: { verkoop: 3200, kostprijs: 2000 },
        correctePosten: ["bank", "voorraad", "eigenVermogen"],
        getMutaties: (b) => ({ bank: b.verkoop, voorraad: -b.kostprijs, eigenVermogen: b.verkoop - b.kostprijs }),
        resultaat: (b) => ({ opbrengsten: b.verkoop, kostprijs: b.kostprijs }),
        liquiditeit: (b) => ({ ontvangsten: b.verkoop }),
        hints: [
          "Bij iDEAL komt het geld direct binnen!",
          "Bank stijgt, voorraad daalt, winst naar EV.",
          "Bank +verkoop, Voorraad -kostprijs, EV +winst"
        ],
        kernprincipe: "Online verkoop: OPBRENGST én ONTVANGST tegelijk!"
      },
      {
        datum: "5 januari",
        getOmschrijving: (b) => `Een klant stuurt een product retour. Terugbetaling: €${b.retour.toLocaleString()}.`,
        getDetail: (b) => `Product (kostprijs €${b.kostprijs.toLocaleString()}) gaat terug in voorraad.`,
        bedragen: { retour: 150, kostprijs: 90 },
        correctePosten: ["bank", "voorraad", "eigenVermogen"],
        getMutaties: (b) => ({ bank: -b.retour, voorraad: b.kostprijs, eigenVermogen: -(b.retour - b.kostprijs) }),
        resultaat: (b) => ({ opbrengsten: -b.retour, kostprijs: -b.kostprijs }),
        liquiditeit: (b) => ({ uitgaven: b.retour }),
        hints: [
          "Retour draait de verkoop om.",
          "Bank daalt, voorraad stijgt, winst daalt.",
          "Bank -retour, Voorraad +kostprijs, EV -winst"
        ],
        kernprincipe: "Retour is negatieve verkoop — omgekeerde boeking!"
      },
      {
        datum: "10 januari",
        getOmschrijving: (b) => `WebShop24 bestelt nieuwe voorraad voor €${b.inkoop.toLocaleString()} bij de leverancier.`,
        getDetail: () => "Betaling binnen 30 dagen.",
        bedragen: { inkoop: 12000 },
        correctePosten: ["voorraad", "crediteuren"],
        getMutaties: (b) => ({ voorraad: b.inkoop, crediteuren: b.inkoop }),
        resultaat: {},
        liquiditeit: {},
        hints: [
          "Voorraad komt binnen, betaling later.",
          "Voorraad stijgt, crediteuren stijgen.",
          "Voorraad +bedrag, Crediteuren +bedrag"
        ],
        kernprincipe: "Inkoop op rekening!"
      },
      {
        datum: "15 januari",
        getOmschrijving: (b) => `WebShop24 betaalt de oude leveranciersschuld van €${b.betaling.toLocaleString()}.`,
        getDetail: () => "Overboeking via de bank.",
        bedragen: { betaling: 3000 },
        linkedBedragen: {
          betaling: { type: 'opening', account: 'crediteuren' }
        },
        correctePosten: ["bank", "crediteuren"],
        getMutaties: (b) => ({ bank: -b.betaling, crediteuren: -b.betaling }),
        resultaat: {},
        liquiditeit: (b) => ({ uitgaven: b.betaling }),
        hints: [
          "Schuld aflossen.",
          "Bank daalt, crediteuren dalen.",
          "Bank -bedrag, Crediteuren -bedrag"
        ],
        kernprincipe: "UITGAVE maar geen KOST!"
      },
      {
        datum: "22 januari",
        getOmschrijving: (b) => `Aflossing van €${b.aflossing.toLocaleString()} op de bedrijfslening.`,
        getDetail: () => "Afgeschreven van de bank.",
        bedragen: { aflossing: 1000 },
        correctePosten: ["bank", "lening"],
        getMutaties: (b) => ({ bank: -b.aflossing, lening: -b.aflossing }),
        resultaat: {},
        liquiditeit: (b) => ({ uitgaven: b.aflossing }),
        hints: [
          "Aflossen is geen kost!",
          "Bank daalt, lening daalt.",
          "Bank -bedrag, Lening -bedrag"
        ],
        kernprincipe: "Aflossen is GEEN kost!"
      },
      {
        datum: "28 januari",
        getOmschrijving: (b) => `Afschrijving op computers en magazijninrichting: €${b.afschrijving.toLocaleString()}.`,
        getDetail: () => "Maandelijkse afschrijving.",
        bedragen: { afschrijving: 100 },
        correctePosten: ["vasteActiva", "eigenVermogen"],
        getMutaties: (b) => ({ vasteActiva: -b.afschrijving, eigenVermogen: -b.afschrijving }),
        resultaat: (b) => ({ afschrijving: b.afschrijving }),
        liquiditeit: {},
        hints: [
          "Waardevermindering apparatuur.",
          "VA dalen, EV daalt.",
          "VA -bedrag, EV -bedrag"
        ],
        kernprincipe: "Afschrijving: KOST maar geen UITGAVE!"
      },
      {
        datum: "31 januari",
        getOmschrijving: (b) => `Rentebetaling van €${b.rente.toLocaleString()} over de lening.`,
        getDetail: () => "Afgeschreven van de bank.",
        bedragen: { rente: 75 },
        correctePosten: ["bank", "eigenVermogen"],
        getMutaties: (b) => ({ bank: -b.rente, eigenVermogen: -b.rente }),
        resultaat: (b) => ({ rente: b.rente }),
        liquiditeit: (b) => ({ uitgaven: b.rente }),
        hints: [
          "Rente is kost én uitgave.",
          "Bank daalt, EV daalt.",
          "Bank -bedrag, EV -bedrag"
        ],
        kernprincipe: "Rente: KOST én UITGAVE!"
      }
    ]
  },
  {
    id: 'garage',
    naam: 'AutoService Bakker',
    emoji: '🔧',
    beschrijving: 'Garage voor reparaties en onderhoud',
    kleur: 'red',
    openingsBalans: {
      vasteActiva: 35000,
      voorraad: 8000,
      debiteuren: 2000,
      bank: 10000,
      kas: 1000,
      eigenVermogen: 40000,
      lening: 15000,
      crediteuren: 1000,
      vooruitontvangen: 0
    },
    transacties: [
      {
        datum: "4 januari",
        getOmschrijving: (b) => `Een klant laat zijn auto repareren. Contante betaling: €${b.verkoop.toLocaleString()}.`,
        getDetail: (b) => `Gebruikte onderdelen: €${b.kostprijs.toLocaleString()}.`,
        bedragen: { verkoop: 850, kostprijs: 300 },
        correctePosten: ["kas", "voorraad", "eigenVermogen"],
        getMutaties: (b) => ({ kas: b.verkoop, voorraad: -b.kostprijs, eigenVermogen: b.verkoop - b.kostprijs }),
        resultaat: (b) => ({ opbrengsten: b.verkoop, kostprijs: b.kostprijs }),
        liquiditeit: (b) => ({ ontvangsten: b.verkoop }),
        hints: [
          "Contante betaling = direct geld in kas.",
          "Kas stijgt, voorraad daalt, winst naar EV.",
          "Kas +verkoop, Voorraad -kostprijs, EV +winst"
        ],
        kernprincipe: "Contant: OPBRENGST én ONTVANGST tegelijk!"
      },
      {
        datum: "8 januari",
        getOmschrijving: (b) => `Leasemaatschappij laat 5 auto's onderhouden. Factuur: €${b.verkoop.toLocaleString()}.`,
        getDetail: (b) => `Onderdelen: €${b.kostprijs.toLocaleString()}. Betaling binnen 14 dagen.`,
        bedragen: { verkoop: 2500, kostprijs: 600 },
        correctePosten: ["debiteuren", "voorraad", "eigenVermogen"],
        getMutaties: (b) => ({ debiteuren: b.verkoop, voorraad: -b.kostprijs, eigenVermogen: b.verkoop - b.kostprijs }),
        resultaat: (b) => ({ opbrengsten: b.verkoop, kostprijs: b.kostprijs }),
        liquiditeit: {},
        hints: [
          "Factuur verstuurd = opbrengst, nog geen geld.",
          "Debiteuren stijgen, voorraad daalt, winst naar EV.",
          "Debiteuren +verkoop, Voorraad -kostprijs, EV +winst"
        ],
        kernprincipe: "OPBRENGST maar geen ONTVANGST!"
      },
      {
        datum: "15 januari",
        getOmschrijving: (b) => `De leasemaatschappij en een oude klant betalen samen €${b.betaling.toLocaleString()}.`,
        getDetail: () => "Totaalbedrag op de bank.",
        bedragen: { betaling: 4500 },
        correctePosten: ["bank", "debiteuren"],
        getMutaties: (b) => ({ bank: b.betaling, debiteuren: -b.betaling }),
        resultaat: {},
        liquiditeit: (b) => ({ ontvangsten: b.betaling }),
        hints: [
          "Geld komt binnen van debiteuren.",
          "Bank stijgt, debiteuren dalen.",
          "Bank +bedrag, Debiteuren -bedrag"
        ],
        kernprincipe: "ONTVANGST zonder OPBRENGST!"
      },
      {
        datum: "18 januari",
        getOmschrijving: (b) => `Bakker bestelt onderdelen voor €${b.inkoop.toLocaleString()} bij de groothandel.`,
        getDetail: () => "Betaling binnen 30 dagen.",
        bedragen: { inkoop: 4000 },
        correctePosten: ["voorraad", "crediteuren"],
        getMutaties: (b) => ({ voorraad: b.inkoop, crediteuren: b.inkoop }),
        resultaat: {},
        liquiditeit: {},
        hints: [
          "Voorraad komt binnen, nog niet betaald.",
          "Voorraad stijgt, crediteuren stijgen.",
          "Voorraad +bedrag, Crediteuren +bedrag"
        ],
        kernprincipe: "Inkoop op rekening!"
      },
      {
        datum: "22 januari",
        getOmschrijving: (b) => `Bakker betaalt €${b.betaling.toLocaleString()} aan de leverancier.`,
        getDetail: () => "Via de bank.",
        bedragen: { betaling: 1000 },
        correctePosten: ["bank", "crediteuren"],
        getMutaties: (b) => ({ bank: -b.betaling, crediteuren: -b.betaling }),
        resultaat: {},
        liquiditeit: (b) => ({ uitgaven: b.betaling }),
        hints: [
          "Schuld wordt betaald.",
          "Bank daalt, crediteuren dalen.",
          "Bank -bedrag, Crediteuren -bedrag"
        ],
        kernprincipe: "UITGAVE maar geen KOST!"
      },
      {
        datum: "28 januari",
        getOmschrijving: (b) => `Afschrijving op hefbrug en gereedschap: €${b.afschrijving.toLocaleString()}.`,
        getDetail: () => "Maandelijkse afschrijving.",
        bedragen: { afschrijving: 500 },
        correctePosten: ["vasteActiva", "eigenVermogen"],
        getMutaties: (b) => ({ vasteActiva: -b.afschrijving, eigenVermogen: -b.afschrijving }),
        resultaat: (b) => ({ afschrijving: b.afschrijving }),
        liquiditeit: {},
        hints: [
          "Waardevermindering apparatuur.",
          "VA dalen, EV daalt.",
          "VA -bedrag, EV -bedrag"
        ],
        kernprincipe: "Afschrijving: KOST maar geen UITGAVE!"
      },
      {
        datum: "31 januari",
        getOmschrijving: (b) => `Aflossing €${b.aflossing.toLocaleString()} en rente €${b.rente.toLocaleString()} op de lening.`,
        getDetail: () => "Afgeschreven van de bank.",
        bedragen: { aflossing: 1000, rente: 100 },
        correctePosten: ["bank", "lening", "eigenVermogen"],
        getMutaties: (b) => ({ bank: -(b.aflossing + b.rente), lening: -b.aflossing, eigenVermogen: -b.rente }),
        resultaat: (b) => ({ rente: b.rente }),
        liquiditeit: (b) => ({ uitgaven: b.aflossing + b.rente }),
        hints: [
          "Aflossing = geen kost, rente = wel kost.",
          "Bank daalt totaal, lening daalt aflossing, EV daalt rente.",
          "Bank -(afl+rente), Lening -afl, EV -rente"
        ],
        kernprincipe: "Aflossing ≠ kost, Rente = kost!"
      }
    ]
  },
  {
    id: 'marketing',
    naam: 'MarketingPro',
    emoji: '📈',
    beschrijving: 'Marketingadviesbureau voor MKB',
    kleur: 'cyan',
    openingsBalans: {
      vasteActiva: 5000,
      voorraad: 0,
      debiteuren: 8000,
      bank: 25000,
      kas: 500,
      eigenVermogen: 35000,
      lening: 3000,
      crediteuren: 500,
      vooruitontvangen: 0
    },
    transacties: [
      {
        datum: "5 januari",
        getOmschrijving: (b) => `MarketingPro voltooit een campagne voor een klant. Factuur: €${b.verkoop.toLocaleString()}.`,
        getDetail: () => "Betaling binnen 30 dagen.",
        bedragen: { verkoop: 6500 },
        correctePosten: ["debiteuren", "eigenVermogen"],
        getMutaties: (b) => ({ debiteuren: b.verkoop, eigenVermogen: b.verkoop }),
        resultaat: (b) => ({ opbrengsten: b.verkoop }),
        liquiditeit: {},
        hints: [
          "Dienst geleverd = opbrengst. Geen voorraad bij een adviesbureau!",
          "Debiteuren stijgen, winst direct naar EV.",
          "Debiteuren +bedrag, EV +bedrag"
        ],
        kernprincipe: "Dienstverlening: OPBRENGST zonder voorraadmutatie!"
      },
      {
        datum: "12 januari",
        getOmschrijving: (b) => `Diverse klanten betalen openstaande facturen: totaal €${b.betaling.toLocaleString()}.`,
        getDetail: () => "Op de bank bijgeschreven.",
        bedragen: { betaling: 10000 },
        correctePosten: ["bank", "debiteuren"],
        getMutaties: (b) => ({ bank: b.betaling, debiteuren: -b.betaling }),
        resultaat: {},
        liquiditeit: (b) => ({ ontvangsten: b.betaling }),
        hints: [
          "Geld komt binnen van debiteuren.",
          "Bank stijgt, debiteuren dalen.",
          "Bank +bedrag, Debiteuren -bedrag"
        ],
        kernprincipe: "ONTVANGST zonder OPBRENGST!"
      },
      {
        datum: "15 januari",
        getOmschrijving: (b) => `MarketingPro betaalt €${b.inkoop.toLocaleString()} aan een freelance designer.`,
        getDetail: () => "Direct overgemaakt.",
        bedragen: { inkoop: 1200 },
        correctePosten: ["bank", "eigenVermogen"],
        getMutaties: (b) => ({ bank: -b.inkoop, eigenVermogen: -b.inkoop }),
        resultaat: (b) => ({ kostprijs: b.inkoop }),
        liquiditeit: (b) => ({ uitgaven: b.inkoop }),
        hints: [
          "Freelancer inschakelen is een directe kost.",
          "Bank daalt, EV daalt.",
          "Bank -bedrag, EV -bedrag"
        ],
        kernprincipe: "Ingehuurd werk: KOST én UITGAVE!"
      },
      {
        datum: "18 januari",
        getOmschrijving: (b) => `Een nieuwe klant betaalt €${b.voorschot.toLocaleString()} voorschot.`,
        getDetail: () => "Project start volgende maand.",
        bedragen: { voorschot: 3000 },
        correctePosten: ["bank", "vooruitontvangen"],
        getMutaties: (b) => ({ bank: b.voorschot, vooruitontvangen: b.voorschot }),
        resultaat: {},
        liquiditeit: (b) => ({ ontvangsten: b.voorschot }),
        hints: [
          "Geld ontvangen voor werk dat nog moet gebeuren.",
          "Bank stijgt, verplichting (vooruitontvangen bedragen) stijgt.",
          "Bank +bedrag, Vooruitontvangen +bedrag"
        ],
        kernprincipe: "Voorschot: ONTVANGST maar nog geen OPBRENGST!"
      },
      {
        datum: "22 januari",
        getOmschrijving: (b) => `MarketingPro koopt nieuwe laptops voor €${b.investering.toLocaleString()}.`,
        getDetail: () => "Betaald via de bank.",
        bedragen: { investering: 3500 },
        correctePosten: ["vasteActiva", "bank"],
        getMutaties: (b) => ({ vasteActiva: b.investering, bank: -b.investering }),
        resultaat: {},
        liquiditeit: (b) => ({ uitgaven: b.investering }),
        hints: [
          "Laptops zijn vaste activa.",
          "VA stijgen, bank daalt.",
          "VA +bedrag, Bank -bedrag"
        ],
        kernprincipe: "Investering is geen kost!"
      },
      {
        datum: "28 januari",
        getOmschrijving: (b) => `Afschrijving op laptops en software: €${b.afschrijving.toLocaleString()}.`,
        getDetail: () => "Maandelijkse afschrijving.",
        bedragen: { afschrijving: 200 },
        correctePosten: ["vasteActiva", "eigenVermogen"],
        getMutaties: (b) => ({ vasteActiva: -b.afschrijving, eigenVermogen: -b.afschrijving }),
        resultaat: (b) => ({ afschrijving: b.afschrijving }),
        liquiditeit: {},
        hints: [
          "Waardevermindering.",
          "VA dalen, EV daalt.",
          "VA -bedrag, EV -bedrag"
        ],
        kernprincipe: "Afschrijving: KOST maar geen UITGAVE!"
      },
      {
        datum: "31 januari",
        getOmschrijving: (b) => `Rentebetaling van €${b.rente.toLocaleString()} over de lening.`,
        getDetail: () => "Afgeschreven van de bank.",
        bedragen: { rente: 25 },
        correctePosten: ["bank", "eigenVermogen"],
        getMutaties: (b) => ({ bank: -b.rente, eigenVermogen: -b.rente }),
        resultaat: (b) => ({ rente: b.rente }),
        liquiditeit: (b) => ({ uitgaven: b.rente }),
        hints: [
          "Rente is kost én uitgave.",
          "Bank daalt, EV daalt.",
          "Bank -bedrag, EV -bedrag"
        ],
        kernprincipe: "Rente: KOST én UITGAVE!"
      }
    ]
  },
  {
    id: 'software',
    naam: 'CodeCraft BV',
    emoji: '💻',
    beschrijving: 'Software-ontwikkelaar met SaaS-producten',
    kleur: 'indigo',
    openingsBalans: {
      vasteActiva: 8000,
      voorraad: 0,
      debiteuren: 5000,
      bank: 45000,
      kas: 0,
      eigenVermogen: 50000,
      lening: 8000,
      crediteuren: 0,
      vooruitontvangen: 0
    },
    transacties: [
      {
        datum: "1 januari",
        getOmschrijving: (b) => `Klanten betalen hun maandelijkse SaaS-abonnementen: €${b.verkoop.toLocaleString()}.`,
        getDetail: () => "Automatische incasso.",
        bedragen: { verkoop: 12000 },
        correctePosten: ["bank", "eigenVermogen"],
        getMutaties: (b) => ({ bank: b.verkoop, eigenVermogen: b.verkoop }),
        resultaat: (b) => ({ opbrengsten: b.verkoop }),
        liquiditeit: (b) => ({ ontvangsten: b.verkoop }),
        hints: [
          "Abonnementen = directe opbrengst én ontvangst.",
          "Bank stijgt, winst naar EV.",
          "Bank +bedrag, EV +bedrag"
        ],
        kernprincipe: "Abonnementen: OPBRENGST én ONTVANGST tegelijk!"
      },
      {
        datum: "8 januari",
        getOmschrijving: (b) => `CodeCraft levert maatwerk voor een klant. Factuur: €${b.verkoop.toLocaleString()}.`,
        getDetail: () => "Betaling binnen 30 dagen.",
        bedragen: { verkoop: 25000 },
        correctePosten: ["debiteuren", "eigenVermogen"],
        getMutaties: (b) => ({ debiteuren: b.verkoop, eigenVermogen: b.verkoop }),
        resultaat: (b) => ({ opbrengsten: b.verkoop }),
        liquiditeit: {},
        hints: [
          "Maatwerk geleverd = opbrengst.",
          "Debiteuren stijgen, EV stijgt.",
          "Debiteuren +bedrag, EV +bedrag"
        ],
        kernprincipe: "OPBRENGST maar geen ONTVANGST!"
      },
      {
        datum: "15 januari",
        getOmschrijving: (b) => `Oude facturen worden betaald: €${b.betaling.toLocaleString()}.`,
        getDetail: () => "Op de bank.",
        bedragen: { betaling: 8000 },
        correctePosten: ["bank", "debiteuren"],
        getMutaties: (b) => ({ bank: b.betaling, debiteuren: -b.betaling }),
        resultaat: {},
        liquiditeit: (b) => ({ ontvangsten: b.betaling }),
        hints: [
          "Geld komt binnen.",
          "Bank stijgt, debiteuren dalen.",
          "Bank +bedrag, Debiteuren -bedrag"
        ],
        kernprincipe: "ONTVANGST zonder OPBRENGST!"
      },
      {
        datum: "20 januari",
        getOmschrijving: (b) => `CodeCraft betaalt €${b.hosting.toLocaleString()} voor cloudservers (AWS).`,
        getDetail: () => "Maandelijkse kosten.",
        bedragen: { hosting: 2500 },
        correctePosten: ["bank", "eigenVermogen"],
        getMutaties: (b) => ({ bank: -b.hosting, eigenVermogen: -b.hosting }),
        resultaat: (b) => ({ overig: b.hosting }),
        liquiditeit: (b) => ({ uitgaven: b.hosting }),
        hints: [
          "Serverkosten zijn directe kosten.",
          "Bank daalt, EV daalt.",
          "Bank -bedrag, EV -bedrag"
        ],
        kernprincipe: "Hostingkosten: KOST én UITGAVE!"
      },
      {
        datum: "25 januari",
        getOmschrijving: (b) => `Aflossing van €${b.aflossing.toLocaleString()} op de bedrijfslening.`,
        getDetail: () => "Via de bank.",
        bedragen: { aflossing: 1000 },
        correctePosten: ["bank", "lening"],
        getMutaties: (b) => ({ bank: -b.aflossing, lening: -b.aflossing }),
        resultaat: {},
        liquiditeit: (b) => ({ uitgaven: b.aflossing }),
        hints: [
          "Aflossen is geen kost!",
          "Bank daalt, lening daalt.",
          "Bank -bedrag, Lening -bedrag"
        ],
        kernprincipe: "Aflossen: GEEN kost!"
      },
      {
        datum: "28 januari",
        getOmschrijving: (b) => `Afschrijving op computers en licenties: €${b.afschrijving.toLocaleString()}.`,
        getDetail: () => "Maandelijkse afschrijving.",
        bedragen: { afschrijving: 300 },
        correctePosten: ["vasteActiva", "eigenVermogen"],
        getMutaties: (b) => ({ vasteActiva: -b.afschrijving, eigenVermogen: -b.afschrijving }),
        resultaat: (b) => ({ afschrijving: b.afschrijving }),
        liquiditeit: {},
        hints: [
          "Waardevermindering.",
          "VA dalen, EV daalt.",
          "VA -bedrag, EV -bedrag"
        ],
        kernprincipe: "Afschrijving: KOST maar geen UITGAVE!"
      },
      {
        datum: "31 januari",
        getOmschrijving: (b) => `Rentebetaling van €${b.rente.toLocaleString()} over de lening.`,
        getDetail: () => "Afgeschreven.",
        bedragen: { rente: 60 },
        correctePosten: ["bank", "eigenVermogen"],
        getMutaties: (b) => ({ bank: -b.rente, eigenVermogen: -b.rente }),
        resultaat: (b) => ({ rente: b.rente }),
        liquiditeit: (b) => ({ uitgaven: b.rente }),
        hints: [
          "Rente is kost én uitgave.",
          "Bank daalt, EV daalt.",
          "Bank -bedrag, EV -bedrag"
        ],
        kernprincipe: "Rente: KOST én UITGAVE!"
      }
    ]
  },
  {
    id: 'transport',
    naam: 'TransLog',
    emoji: '🚚',
    beschrijving: 'Transportbedrijf voor regionaal vervoer',
    kleur: 'amber',
    openingsBalans: {
      vasteActiva: 120000,
      voorraad: 0,
      debiteuren: 15000,
      bank: 20000,
      kas: 1000,
      eigenVermogen: 80000,
      lening: 75000,
      crediteuren: 1000,
      vooruitontvangen: 0
    },
    transacties: [
      {
        datum: "5 januari",
        getOmschrijving: (b) => `TransLog factureert klanten voor transporten: €${b.verkoop.toLocaleString()}.`,
        getDetail: () => "Betaling binnen 14 dagen.",
        bedragen: { verkoop: 18000 },
        correctePosten: ["debiteuren", "eigenVermogen"],
        getMutaties: (b) => ({ debiteuren: b.verkoop, eigenVermogen: b.verkoop }),
        resultaat: (b) => ({ opbrengsten: b.verkoop }),
        liquiditeit: {},
        hints: [
          "Transport geleverd = opbrengst. Geen voorraad!",
          "Debiteuren stijgen, EV stijgt.",
          "Debiteuren +bedrag, EV +bedrag"
        ],
        kernprincipe: "Transport: OPBRENGST zonder voorraadmutatie!"
      },
      {
        datum: "10 januari",
        getOmschrijving: (b) => `TransLog tankt diesel voor €${b.brandstof.toLocaleString()}.`,
        getDetail: () => "Betaald met tankpas (crediteur).",
        bedragen: { brandstof: 4500 },
        correctePosten: ["crediteuren", "eigenVermogen"],
        getMutaties: (b) => ({ crediteuren: b.brandstof, eigenVermogen: -b.brandstof }),
        resultaat: (b) => ({ kostprijs: b.brandstof }),
        liquiditeit: {},
        hints: [
          "Brandstof is directe kost, tankpas = later betalen.",
          "Crediteuren stijgen, EV daalt.",
          "Crediteuren +bedrag, EV -bedrag"
        ],
        kernprincipe: "Kost op rekening: KOST maar nog geen UITGAVE!"
      },
      {
        datum: "15 januari",
        getOmschrijving: (b) => `Klanten betalen openstaande facturen: €${b.betaling.toLocaleString()}.`,
        getDetail: () => "Op de bank.",
        bedragen: { betaling: 20000 },
        correctePosten: ["bank", "debiteuren"],
        getMutaties: (b) => ({ bank: b.betaling, debiteuren: -b.betaling }),
        resultaat: {},
        liquiditeit: (b) => ({ ontvangsten: b.betaling }),
        hints: [
          "Geld komt binnen.",
          "Bank stijgt, debiteuren dalen.",
          "Bank +bedrag, Debiteuren -bedrag"
        ],
        kernprincipe: "ONTVANGST zonder OPBRENGST!"
      },
      {
        datum: "20 januari",
        getOmschrijving: (b) => `TransLog betaalt de brandstofrekening van €${b.betaling.toLocaleString()}.`,
        getDetail: () => "Tankpas afrekening.",
        bedragen: { betaling: 4500 },
        linkedBedragen: {
          betaling: { type: 'transaction', txIndex: 1, key: 'brandstof' }
        },
        correctePosten: ["bank", "crediteuren"],
        getMutaties: (b) => ({ bank: -b.betaling, crediteuren: -b.betaling }),
        resultaat: {},
        liquiditeit: (b) => ({ uitgaven: b.betaling }),
        hints: [
          "Schuld wordt betaald.",
          "Bank daalt, crediteuren dalen.",
          "Bank -bedrag, Crediteuren -bedrag"
        ],
        kernprincipe: "UITGAVE maar geen KOST (die was al geboekt)!"
      },
      {
        datum: "25 januari",
        getOmschrijving: (b) => `Aflossing van €${b.aflossing.toLocaleString()} op de vrachtwagenlening.`,
        getDetail: () => "Maandelijkse aflossing.",
        bedragen: { aflossing: 3000 },
        correctePosten: ["bank", "lening"],
        getMutaties: (b) => ({ bank: -b.aflossing, lening: -b.aflossing }),
        resultaat: {},
        liquiditeit: (b) => ({ uitgaven: b.aflossing }),
        hints: [
          "Aflossen is geen kost!",
          "Bank daalt, lening daalt.",
          "Bank -bedrag, Lening -bedrag"
        ],
        kernprincipe: "Aflossen: GEEN kost!"
      },
      {
        datum: "28 januari",
        getOmschrijving: (b) => `Afschrijving op de vrachtwagens: €${b.afschrijving.toLocaleString()}.`,
        getDetail: () => "Maandelijkse afschrijving.",
        bedragen: { afschrijving: 2000 },
        correctePosten: ["vasteActiva", "eigenVermogen"],
        getMutaties: (b) => ({ vasteActiva: -b.afschrijving, eigenVermogen: -b.afschrijving }),
        resultaat: (b) => ({ afschrijving: b.afschrijving }),
        liquiditeit: {},
        hints: [
          "Waardevermindering vrachtwagens.",
          "VA dalen, EV daalt.",
          "VA -bedrag, EV -bedrag"
        ],
        kernprincipe: "Afschrijving: KOST maar geen UITGAVE!"
      },
      {
        datum: "31 januari",
        getOmschrijving: (b) => `Rentebetaling van €${b.rente.toLocaleString()} over de leningen.`,
        getDetail: () => "Afgeschreven van de bank.",
        bedragen: { rente: 500 },
        correctePosten: ["bank", "eigenVermogen"],
        getMutaties: (b) => ({ bank: -b.rente, eigenVermogen: -b.rente }),
        resultaat: (b) => ({ rente: b.rente }),
        liquiditeit: (b) => ({ uitgaven: b.rente }),
        hints: [
          "Rente is kost én uitgave.",
          "Bank daalt, EV daalt.",
          "Bank -bedrag, EV -bedrag"
        ],
        kernprincipe: "Rente: KOST én UITGAVE!"
      }
    ]
  },
  {
    id: 'detachering',
    naam: 'FlexForce',
    emoji: '👔',
    beschrijving: 'Detachering van IT-professionals',
    kleur: 'teal',
    openingsBalans: {
      vasteActiva: 3000,
      voorraad: 0,
      debiteuren: 45000,
      bank: 30000,
      kas: 0,
      eigenVermogen: 60000,
      lening: 15000,
      crediteuren: 3000,
      vooruitontvangen: 0
    },
    transacties: [
      {
        datum: "3 januari",
        getOmschrijving: (b) => `FlexForce factureert klanten voor gedetacheerde medewerkers: €${b.verkoop.toLocaleString()}.`,
        getDetail: () => "Betaling binnen 30 dagen.",
        bedragen: { verkoop: 85000 },
        correctePosten: ["debiteuren", "eigenVermogen"],
        getMutaties: (b) => ({ debiteuren: b.verkoop, eigenVermogen: b.verkoop }),
        resultaat: (b) => ({ opbrengsten: b.verkoop }),
        liquiditeit: {},
        hints: [
          "Uren gemaakt = opbrengst. Geen voorraad bij detachering!",
          "Debiteuren stijgen, EV stijgt.",
          "Debiteuren +bedrag, EV +bedrag"
        ],
        kernprincipe: "Detachering: OPBRENGST zonder voorraad!"
      },
      {
        datum: "5 januari",
        getOmschrijving: (b) => `FlexForce betaalt de salarissen: €${b.salarissen.toLocaleString()}.`,
        getDetail: () => "Maandelijks salaris van de gedetacheerden.",
        bedragen: { salarissen: 55000 },
        correctePosten: ["bank", "eigenVermogen"],
        getMutaties: (b) => ({ bank: -b.salarissen, eigenVermogen: -b.salarissen }),
        resultaat: (b) => ({ kostprijs: b.salarissen }),
        liquiditeit: (b) => ({ uitgaven: b.salarissen }),
        hints: [
          "Salarissen zijn directe kosten.",
          "Bank daalt, EV daalt.",
          "Bank -bedrag, EV -bedrag"
        ],
        kernprincipe: "Salarissen: KOST én UITGAVE!"
      },
      {
        datum: "15 januari",
        getOmschrijving: (b) => `Klanten betalen openstaande facturen: €${b.betaling.toLocaleString()}.`,
        getDetail: () => "Op de bank.",
        bedragen: { betaling: 60000 },
        correctePosten: ["bank", "debiteuren"],
        getMutaties: (b) => ({ bank: b.betaling, debiteuren: -b.betaling }),
        resultaat: {},
        liquiditeit: (b) => ({ ontvangsten: b.betaling }),
        hints: [
          "Geld komt binnen.",
          "Bank stijgt, debiteuren dalen.",
          "Bank +bedrag, Debiteuren -bedrag"
        ],
        kernprincipe: "ONTVANGST zonder OPBRENGST!"
      },
      {
        datum: "20 januari",
        getOmschrijving: (b) => `FlexForce betaalt €${b.recruitment.toLocaleString()} aan het recruitmentbureau.`,
        getDetail: () => "Oude schuld voor het vinden van medewerkers.",
        bedragen: { recruitment: 3000 },
        linkedBedragen: {
          recruitment: { type: 'opening', account: 'crediteuren' }
        },
        correctePosten: ["bank", "crediteuren"],
        getMutaties: (b) => ({ bank: -b.recruitment, crediteuren: -b.recruitment }),
        resultaat: {},
        liquiditeit: (b) => ({ uitgaven: b.recruitment }),
        hints: [
          "Oude schuld wordt betaald.",
          "Bank daalt, crediteuren dalen.",
          "Bank -bedrag, Crediteuren -bedrag"
        ],
        kernprincipe: "UITGAVE maar geen KOST (al eerder geboekt)!"
      },
      {
        datum: "25 januari",
        getOmschrijving: (b) => `Aflossing van €${b.aflossing.toLocaleString()} op de bedrijfslening.`,
        getDetail: () => "Maandelijkse aflossing.",
        bedragen: { aflossing: 1500 },
        correctePosten: ["bank", "lening"],
        getMutaties: (b) => ({ bank: -b.aflossing, lening: -b.aflossing }),
        resultaat: {},
        liquiditeit: (b) => ({ uitgaven: b.aflossing }),
        hints: [
          "Aflossen is geen kost!",
          "Bank daalt, lening daalt.",
          "Bank -bedrag, Lening -bedrag"
        ],
        kernprincipe: "Aflossen: GEEN kost!"
      },
      {
        datum: "28 januari",
        getOmschrijving: (b) => `Afschrijving op kantoorinventaris: €${b.afschrijving.toLocaleString()}.`,
        getDetail: () => "Maandelijkse afschrijving.",
        bedragen: { afschrijving: 100 },
        correctePosten: ["vasteActiva", "eigenVermogen"],
        getMutaties: (b) => ({ vasteActiva: -b.afschrijving, eigenVermogen: -b.afschrijving }),
        resultaat: (b) => ({ afschrijving: b.afschrijving }),
        liquiditeit: {},
        hints: [
          "Waardevermindering.",
          "VA dalen, EV daalt.",
          "VA -bedrag, EV -bedrag"
        ],
        kernprincipe: "Afschrijving: KOST maar geen UITGAVE!"
      },
      {
        datum: "31 januari",
        getOmschrijving: (b) => `Rentebetaling van €${b.rente.toLocaleString()} over de lening.`,
        getDetail: () => "Afgeschreven.",
        bedragen: { rente: 100 },
        correctePosten: ["bank", "eigenVermogen"],
        getMutaties: (b) => ({ bank: -b.rente, eigenVermogen: -b.rente }),
        resultaat: (b) => ({ rente: b.rente }),
        liquiditeit: (b) => ({ uitgaven: b.rente }),
        hints: [
          "Rente is kost én uitgave.",
          "Bank daalt, EV daalt.",
          "Bank -bedrag, EV -bedrag"
        ],
        kernprincipe: "Rente: KOST én UITGAVE!"
      }
    ]
  },
  {
    id: 'events',
    naam: 'EventStars',
    emoji: '🎪',
    beschrijving: 'Organisatie van bedrijfsevenementen',
    kleur: 'fuchsia',
    openingsBalans: {
      vasteActiva: 15000,
      voorraad: 2000,
      debiteuren: 10000,
      bank: 18000,
      kas: 2000,
      eigenVermogen: 35000,
      lening: 10000,
      crediteuren: 2000,
      vooruitontvangen: 0
    },
    transacties: [
      {
        datum: "3 januari",
        getOmschrijving: (b) => `Een bedrijf boekt een kick-off event. Vooruitbetaling: €${b.vooruit.toLocaleString()} (40%).`,
        getDetail: () => "Event is eind januari.",
        bedragen: { vooruit: 6000 },
        correctePosten: ["bank", "vooruitontvangen"],
        getMutaties: (b) => ({ bank: b.vooruit, vooruitontvangen: b.vooruit }),
        resultaat: {},
        liquiditeit: (b) => ({ ontvangsten: b.vooruit }),
        hints: [
          "Geld ontvangen, event nog niet geleverd.",
          "Bank stijgt, verplichting (vooruitontvangen bedragen) stijgt.",
          "Bank +bedrag, Vooruitontvangen +bedrag"
        ],
        kernprincipe: "Vooruitbetaling: ONTVANGST maar geen OPBRENGST!"
      },
      {
        datum: "10 januari",
        getOmschrijving: (b) => `EventStars huurt materiaal voor €${b.huur.toLocaleString()}.`,
        getDetail: () => "Op rekening bij de verhuurder.",
        bedragen: { huur: 3500 },
        correctePosten: ["crediteuren", "eigenVermogen"],
        getMutaties: (b) => ({ crediteuren: b.huur, eigenVermogen: -b.huur }),
        resultaat: (b) => ({ kostprijs: b.huur }),
        liquiditeit: {},
        hints: [
          "Huur is een kost, nog niet betaald.",
          "Crediteuren stijgen, EV daalt.",
          "Crediteuren +bedrag, EV -bedrag"
        ],
        kernprincipe: "Kost op rekening: KOST maar nog geen UITGAVE!"
      },
      {
        datum: "15 januari",
        getOmschrijving: (b) => `Een oude klant betaalt een factuur van €${b.betaling.toLocaleString()}.`,
        getDetail: () => "Op de bank.",
        bedragen: { betaling: 10000 },
        linkedBedragen: {
          betaling: { type: 'opening', account: 'debiteuren' }
        },
        correctePosten: ["bank", "debiteuren"],
        getMutaties: (b) => ({ bank: b.betaling, debiteuren: -b.betaling }),
        resultaat: {},
        liquiditeit: (b) => ({ ontvangsten: b.betaling }),
        hints: [
          "Geld komt binnen.",
          "Bank stijgt, debiteuren dalen.",
          "Bank +bedrag, Debiteuren -bedrag"
        ],
        kernprincipe: "ONTVANGST zonder OPBRENGST!"
      },
      {
        datum: "25 januari",
        getOmschrijving: (b) => `Het kick-off event vindt plaats. Totale waarde: €${b.totaal.toLocaleString()}.`,
        getDetail: (b) => `Materiaalkosten: €${b.materiaal.toLocaleString()}. Vooruitbetaald was €${b.vooruit.toLocaleString()}.`,
        bedragen: { totaal: 15000, vooruit: 6000, materiaal: 2000 },
        linkedBedragen: {
          vooruit: { type: 'transaction', txIndex: 0, key: 'vooruit' }
        },
        correctePosten: ["debiteuren", "voorraad", "eigenVermogen", "vooruitontvangen"],
        getMutaties: (b) => ({ debiteuren: b.totaal - b.vooruit, voorraad: -b.materiaal, eigenVermogen: b.totaal - b.materiaal, vooruitontvangen: -b.vooruit }),
        resultaat: (b) => ({ opbrengsten: b.totaal, kostprijs: b.materiaal }),
        liquiditeit: {},
        hints: [
          "Event geleverd: vooruitbetaling wordt opbrengst, rest wordt debiteur.",
          "Debiteuren +rest, Voorraad -materiaal, EV +winst, Vooruitontvangen -vooruit.",
          "Vier posten muteren!"
        ],
        kernprincipe: "Bij levering wordt vooruitbetaling omgezet in opbrengst!"
      },
      {
        datum: "28 januari",
        getOmschrijving: (b) => `EventStars betaalt de verhuurder €${b.betaling.toLocaleString()}.`,
        getDetail: () => "Via de bank.",
        bedragen: { betaling: 3500 },
        linkedBedragen: {
          betaling: { type: 'transaction', txIndex: 1, key: 'huur' }
        },
        correctePosten: ["bank", "crediteuren"],
        getMutaties: (b) => ({ bank: -b.betaling, crediteuren: -b.betaling }),
        resultaat: {},
        liquiditeit: (b) => ({ uitgaven: b.betaling }),
        hints: [
          "Schuld wordt betaald.",
          "Bank daalt, crediteuren dalen.",
          "Bank -bedrag, Crediteuren -bedrag"
        ],
        kernprincipe: "UITGAVE maar geen KOST!"
      },
      {
        datum: "29 januari",
        getOmschrijving: (b) => `Afschrijving op geluid- en lichtapparatuur: €${b.afschrijving.toLocaleString()}.`,
        getDetail: () => "Maandelijkse afschrijving.",
        bedragen: { afschrijving: 400 },
        correctePosten: ["vasteActiva", "eigenVermogen"],
        getMutaties: (b) => ({ vasteActiva: -b.afschrijving, eigenVermogen: -b.afschrijving }),
        resultaat: (b) => ({ afschrijving: b.afschrijving }),
        liquiditeit: {},
        hints: [
          "Waardevermindering.",
          "VA dalen, EV daalt.",
          "VA -bedrag, EV -bedrag"
        ],
        kernprincipe: "Afschrijving: KOST maar geen UITGAVE!"
      },
      {
        datum: "31 januari",
        getOmschrijving: (b) => `Aflossing €${b.aflossing.toLocaleString()} en rente €${b.rente.toLocaleString()} op de lening.`,
        getDetail: () => "Afgeschreven van de bank.",
        bedragen: { aflossing: 800, rente: 70 },
        correctePosten: ["bank", "lening", "eigenVermogen"],
        getMutaties: (b) => ({ bank: -(b.aflossing + b.rente), lening: -b.aflossing, eigenVermogen: -b.rente }),
        resultaat: (b) => ({ rente: b.rente }),
        liquiditeit: (b) => ({ uitgaven: b.aflossing + b.rente }),
        hints: [
          "Aflossing = geen kost, rente = wel kost.",
          "Bank daalt totaal, lening daalt aflossing, EV daalt rente.",
          "Bank -(afl+rente), Lening -afl, EV -rente"
        ],
        kernprincipe: "Aflossing ≠ kost, Rente = kost!"
      }
    ]
  },
  {
    id: 'telefoon',
    naam: 'PhoneFixxx',
    emoji: '📱',
    beschrijving: 'Telefoonwinkel met reparatieservice',
    kleur: 'lime',
    openingsBalans: {
      vasteActiva: 5000,
      voorraad: 20000,
      debiteuren: 500,
      bank: 8000,
      kas: 1500,
      eigenVermogen: 25000,
      lening: 8000,
      crediteuren: 2000,
      vooruitontvangen: 0
    },
    transacties: [
      {
        datum: "4 januari",
        getOmschrijving: (b) => `Klant koopt een telefoon voor €${b.verkoop.toLocaleString()} en pint direct.`,
        getDetail: (b) => `Kostprijs: €${b.kostprijs.toLocaleString()}.`,
        bedragen: { verkoop: 899, kostprijs: 650 },
        correctePosten: ["bank", "voorraad", "eigenVermogen"],
        getMutaties: (b) => ({ bank: b.verkoop, voorraad: -b.kostprijs, eigenVermogen: b.verkoop - b.kostprijs }),
        resultaat: (b) => ({ opbrengsten: b.verkoop, kostprijs: b.kostprijs }),
        liquiditeit: (b) => ({ ontvangsten: b.verkoop }),
        hints: [
          "Pinbetaling = direct geld binnen.",
          "Bank stijgt, voorraad daalt, winst naar EV.",
          "Bank +verkoop, Voorraad -kostprijs, EV +winst"
        ],
        kernprincipe: "Pinbetaling: OPBRENGST én ONTVANGST tegelijk!"
      },
      {
        datum: "8 januari",
        getOmschrijving: (b) => `Klant laat telefoonscherm repareren voor €${b.verkoop.toLocaleString()} contant.`,
        getDetail: (b) => `Onderdeel kost €${b.kostprijs.toLocaleString()}.`,
        bedragen: { verkoop: 150, kostprijs: 45 },
        correctePosten: ["kas", "voorraad", "eigenVermogen"],
        getMutaties: (b) => ({ kas: b.verkoop, voorraad: -b.kostprijs, eigenVermogen: b.verkoop - b.kostprijs }),
        resultaat: (b) => ({ opbrengsten: b.verkoop, kostprijs: b.kostprijs }),
        liquiditeit: (b) => ({ ontvangsten: b.verkoop }),
        hints: [
          "Contant = geld in kas.",
          "Kas stijgt, voorraad daalt, winst naar EV.",
          "Kas +verkoop, Voorraad -kostprijs, EV +winst"
        ],
        kernprincipe: "Reparatie: dienst + onderdeel!"
      },
      {
        datum: "12 januari",
        getOmschrijving: (b) => `PhoneFixxx bestelt telefoons voor €${b.inkoop.toLocaleString()} bij de groothandel.`,
        getDetail: () => "Betaling binnen 30 dagen.",
        bedragen: { inkoop: 8000 },
        correctePosten: ["voorraad", "crediteuren"],
        getMutaties: (b) => ({ voorraad: b.inkoop, crediteuren: b.inkoop }),
        resultaat: {},
        liquiditeit: {},
        hints: [
          "Voorraad komt binnen, later betalen.",
          "Voorraad stijgt, crediteuren stijgen.",
          "Voorraad +bedrag, Crediteuren +bedrag"
        ],
        kernprincipe: "Inkoop op rekening!"
      },
      {
        datum: "18 januari",
        getOmschrijving: (b) => `PhoneFixxx betaalt de oude leveranciersschuld van €${b.betaling.toLocaleString()}.`,
        getDetail: () => "Via de bank.",
        bedragen: { betaling: 2000 },
        linkedBedragen: {
          betaling: { type: 'opening', account: 'crediteuren' }
        },
        correctePosten: ["bank", "crediteuren"],
        getMutaties: (b) => ({ bank: -b.betaling, crediteuren: -b.betaling }),
        resultaat: {},
        liquiditeit: (b) => ({ uitgaven: b.betaling }),
        hints: [
          "Schuld wordt betaald.",
          "Bank daalt, crediteuren dalen.",
          "Bank -bedrag, Crediteuren -bedrag"
        ],
        kernprincipe: "UITGAVE maar geen KOST!"
      },
      {
        datum: "22 januari",
        getOmschrijving: (b) => `De eigenaar stort €${b.storting.toLocaleString()} kasgeld op de bank.`,
        getDetail: () => "Voor veiligheid.",
        bedragen: { storting: 1000 },
        correctePosten: ["bank", "kas"],
        getMutaties: (b) => ({ bank: b.storting, kas: -b.storting }),
        resultaat: {},
        liquiditeit: {},
        hints: [
          "Geld verplaatsen = geen effect op totaal.",
          "Bank stijgt, kas daalt.",
          "Bank +bedrag, Kas -bedrag"
        ],
        kernprincipe: "Interne overboeking!"
      },
      {
        datum: "28 januari",
        getOmschrijving: (b) => `Afschrijving op inventaris en reparatieapparatuur: €${b.afschrijving.toLocaleString()}.`,
        getDetail: () => "Maandelijks.",
        bedragen: { afschrijving: 150 },
        correctePosten: ["vasteActiva", "eigenVermogen"],
        getMutaties: (b) => ({ vasteActiva: -b.afschrijving, eigenVermogen: -b.afschrijving }),
        resultaat: (b) => ({ afschrijving: b.afschrijving }),
        liquiditeit: {},
        hints: [
          "Waardevermindering.",
          "VA dalen, EV daalt.",
          "VA -bedrag, EV -bedrag"
        ],
        kernprincipe: "Afschrijving: KOST maar geen UITGAVE!"
      },
      {
        datum: "31 januari",
        getOmschrijving: (b) => `Aflossing €${b.aflossing.toLocaleString()} en rente €${b.rente.toLocaleString()} op de lening.`,
        getDetail: () => "Afgeschreven van de bank.",
        bedragen: { aflossing: 600, rente: 55 },
        correctePosten: ["bank", "lening", "eigenVermogen"],
        getMutaties: (b) => ({ bank: -(b.aflossing + b.rente), lening: -b.aflossing, eigenVermogen: -b.rente }),
        resultaat: (b) => ({ rente: b.rente }),
        liquiditeit: (b) => ({ uitgaven: b.aflossing + b.rente }),
        hints: [
          "Aflossing ≠ kost, rente = kost.",
          "Bank daalt totaal, lening daalt aflossing, EV daalt rente.",
          "Bank -(afl+rente), Lening -afl, EV -rente"
        ],
        kernprincipe: "Aflossing ≠ kost, Rente = kost!"
      }
    ]
  },
  {
    id: 'machinebouw',
    naam: 'TechMachines',
    emoji: '⚙️',
    beschrijving: 'Machinebouwer voor de industrie',
    kleur: 'slate',
    openingsBalans: {
      vasteActiva: 85000,
      voorraad: 35000,
      debiteuren: 40000,
      bank: 25000,
      kas: 0,
      eigenVermogen: 120000,
      lening: 60000,
      crediteuren: 5000,
      vooruitontvangen: 0
    },
    transacties: [
      {
        datum: "5 januari",
        getOmschrijving: (b) => `TechMachines levert een machine. Factuur: €${b.verkoop.toLocaleString()}.`,
        getDetail: (b) => `Kostprijs onderdelen: €${b.kostprijs.toLocaleString()}. Betaling binnen 60 dagen.`,
        bedragen: { verkoop: 75000, kostprijs: 45000 },
        correctePosten: ["debiteuren", "voorraad", "eigenVermogen"],
        getMutaties: (b) => ({ debiteuren: b.verkoop, voorraad: -b.kostprijs, eigenVermogen: b.verkoop - b.kostprijs }),
        resultaat: (b) => ({ opbrengsten: b.verkoop, kostprijs: b.kostprijs }),
        liquiditeit: {},
        hints: [
          "Machine geleverd = opbrengst, nog niet betaald.",
          "Debiteuren stijgen, voorraad daalt, winst naar EV.",
          "Debiteuren +verkoop, Voorraad -kostprijs, EV +winst"
        ],
        kernprincipe: "OPBRENGST maar geen ONTVANGST!"
      },
      {
        datum: "12 januari",
        getOmschrijving: (b) => `TechMachines ontvangt betaling van €${b.betaling.toLocaleString()} voor een oude levering.`,
        getDetail: () => "Op de bank.",
        bedragen: { betaling: 40000 },
        linkedBedragen: {
          betaling: { type: 'opening', account: 'debiteuren' }
        },
        correctePosten: ["bank", "debiteuren"],
        getMutaties: (b) => ({ bank: b.betaling, debiteuren: -b.betaling }),
        resultaat: {},
        liquiditeit: (b) => ({ ontvangsten: b.betaling }),
        hints: [
          "Geld komt binnen.",
          "Bank stijgt, debiteuren dalen.",
          "Bank +bedrag, Debiteuren -bedrag"
        ],
        kernprincipe: "ONTVANGST zonder OPBRENGST!"
      },
      {
        datum: "15 januari",
        getOmschrijving: (b) => `TechMachines bestelt onderdelen voor €${b.inkoop.toLocaleString()}.`,
        getDetail: () => "Betaling binnen 30 dagen.",
        bedragen: { inkoop: 25000 },
        correctePosten: ["voorraad", "crediteuren"],
        getMutaties: (b) => ({ voorraad: b.inkoop, crediteuren: b.inkoop }),
        resultaat: {},
        liquiditeit: {},
        hints: [
          "Onderdelen komen binnen, later betalen.",
          "Voorraad stijgt, crediteuren stijgen.",
          "Voorraad +bedrag, Crediteuren +bedrag"
        ],
        kernprincipe: "Inkoop op rekening!"
      },
      {
        datum: "20 januari",
        getOmschrijving: (b) => `TechMachines betaalt de oude leveranciersschulden: €${b.betaling.toLocaleString()}.`,
        getDetail: () => "Via de bank.",
        bedragen: { betaling: 5000 },
        linkedBedragen: {
          betaling: { type: 'opening', account: 'crediteuren' }
        },
        correctePosten: ["bank", "crediteuren"],
        getMutaties: (b) => ({ bank: -b.betaling, crediteuren: -b.betaling }),
        resultaat: {},
        liquiditeit: (b) => ({ uitgaven: b.betaling }),
        hints: [
          "Schuld wordt betaald.",
          "Bank daalt, crediteuren dalen.",
          "Bank -bedrag, Crediteuren -bedrag"
        ],
        kernprincipe: "UITGAVE maar geen KOST!"
      },
      {
        datum: "25 januari",
        getOmschrijving: (b) => `Aflossing van €${b.aflossing.toLocaleString()} op de investeringslening.`,
        getDetail: () => "Maandelijkse aflossing.",
        bedragen: { aflossing: 5000 },
        correctePosten: ["bank", "lening"],
        getMutaties: (b) => ({ bank: -b.aflossing, lening: -b.aflossing }),
        resultaat: {},
        liquiditeit: (b) => ({ uitgaven: b.aflossing }),
        hints: [
          "Aflossen is geen kost!",
          "Bank daalt, lening daalt.",
          "Bank -bedrag, Lening -bedrag"
        ],
        kernprincipe: "Aflossen: GEEN kost!"
      },
      {
        datum: "28 januari",
        getOmschrijving: (b) => `Afschrijving op machines en apparatuur: €${b.afschrijving.toLocaleString()}.`,
        getDetail: () => "Maandelijkse afschrijving.",
        bedragen: { afschrijving: 1500 },
        correctePosten: ["vasteActiva", "eigenVermogen"],
        getMutaties: (b) => ({ vasteActiva: -b.afschrijving, eigenVermogen: -b.afschrijving }),
        resultaat: (b) => ({ afschrijving: b.afschrijving }),
        liquiditeit: {},
        hints: [
          "Waardevermindering machines.",
          "VA dalen, EV daalt.",
          "VA -bedrag, EV -bedrag"
        ],
        kernprincipe: "Afschrijving: KOST maar geen UITGAVE!"
      },
      {
        datum: "31 januari",
        getOmschrijving: (b) => `Rentebetaling van €${b.rente.toLocaleString()} over de lening.`,
        getDetail: () => "Afgeschreven van de bank.",
        bedragen: { rente: 400 },
        correctePosten: ["bank", "eigenVermogen"],
        getMutaties: (b) => ({ bank: -b.rente, eigenVermogen: -b.rente }),
        resultaat: (b) => ({ rente: b.rente }),
        liquiditeit: (b) => ({ uitgaven: b.rente }),
        hints: [
          "Rente is kost én uitgave.",
          "Bank daalt, EV daalt.",
          "Bank -bedrag, EV -bedrag"
        ],
        kernprincipe: "Rente: KOST én UITGAVE!"
      }
    ]
  },
  {
    id: 'hotel',
    naam: 'Hotel De Gouden Leeuw',
    emoji: '🏨',
    beschrijving: 'Familiehotel met 25 kamers in het centrum',
    kleur: 'yellow',
    openingsBalans: {
      vasteActiva: 450000,
      voorraad: 5000,
      debiteuren: 8000,
      bank: 35000,
      kas: 3000,
      eigenVermogen: 350000,
      lening: 150000,
      crediteuren: 1000,
      vooruitontvangen: 0
    },
    transacties: [
      {
        datum: "2 januari",
        getOmschrijving: (b) => `Gasten checken uit en betalen €${b.verkoop.toLocaleString()} contant aan de balie.`,
        getDetail: (b) => `Minibarverbruik: €${b.kostprijs.toLocaleString()}.`,
        bedragen: { verkoop: 1850, kostprijs: 120 },
        correctePosten: ["kas", "voorraad", "eigenVermogen"],
        getMutaties: (b) => ({ kas: b.verkoop, voorraad: -b.kostprijs, eigenVermogen: b.verkoop - b.kostprijs }),
        resultaat: (b) => ({ opbrengsten: b.verkoop, kostprijs: b.kostprijs }),
        liquiditeit: (b) => ({ ontvangsten: b.verkoop }),
        hints: [
          "Contante betaling = direct geld in kas.",
          "Kas stijgt, voorraad (minibar) daalt, winst naar EV.",
          "Kas +verkoop, Voorraad -kostprijs, EV +winst"
        ],
        kernprincipe: "Contant: OPBRENGST én ONTVANGST tegelijk!"
      },
      {
        datum: "5 januari",
        getOmschrijving: (b) => `Een bedrijf boekt 10 kamers voor een conferentie. Aanbetaling: €${b.vooruit.toLocaleString()} (50%).`,
        getDetail: () => "Verblijf is eind januari.",
        bedragen: { vooruit: 4500 },
        correctePosten: ["bank", "vooruitontvangen"],
        getMutaties: (b) => ({ bank: b.vooruit, vooruitontvangen: b.vooruit }),
        resultaat: {},
        liquiditeit: (b) => ({ ontvangsten: b.vooruit }),
        hints: [
          "Geld ontvangen, maar de kamers zijn nog niet gebruikt.",
          "Bank stijgt, verplichting (vooruitontvangen bedragen) stijgt.",
          "Bank +bedrag, Vooruitontvangen +bedrag"
        ],
        kernprincipe: "Aanbetaling: ONTVANGST maar nog geen OPBRENGST!"
      },
      {
        datum: "10 januari",
        getOmschrijving: (b) => `Het hotel factureert een reisbureau voor doorgestuurde gasten: €${b.verkoop.toLocaleString()}.`,
        getDetail: () => "Betaling binnen 30 dagen.",
        bedragen: { verkoop: 6200 },
        correctePosten: ["debiteuren", "eigenVermogen"],
        getMutaties: (b) => ({ debiteuren: b.verkoop, eigenVermogen: b.verkoop }),
        resultaat: (b) => ({ opbrengsten: b.verkoop }),
        liquiditeit: {},
        hints: [
          "Factuur verstuurd = opbrengst, nog geen geld.",
          "Debiteuren stijgen, EV stijgt.",
          "Debiteuren +verkoop, EV +verkoop"
        ],
        kernprincipe: "OPBRENGST maar geen ONTVANGST!"
      },
      {
        datum: "15 januari",
        getOmschrijving: (b) => `Het reisbureau en oude debiteuren betalen: €${b.betaling.toLocaleString()}.`,
        getDetail: () => "Op de bank.",
        bedragen: { betaling: 12000 },
        correctePosten: ["bank", "debiteuren"],
        getMutaties: (b) => ({ bank: b.betaling, debiteuren: -b.betaling }),
        resultaat: {},
        liquiditeit: (b) => ({ ontvangsten: b.betaling }),
        hints: [
          "Geld komt binnen van debiteuren.",
          "Bank stijgt, debiteuren dalen.",
          "Bank +bedrag, Debiteuren -bedrag"
        ],
        kernprincipe: "ONTVANGST zonder OPBRENGST!"
      },
      {
        datum: "25 januari",
        getOmschrijving: (b) => `De conferentie vindt plaats. Totale waarde: €${b.totaal.toLocaleString()}.`,
        getDetail: (b) => `Vooruitbetaald was €${b.vooruit.toLocaleString()}. Rest wordt gefactureerd.`,
        bedragen: { totaal: 9000, vooruit: 4500 },
        linkedBedragen: {
          vooruit: { type: 'transaction', txIndex: 1, key: 'vooruit' }
        },
        correctePosten: ["debiteuren", "eigenVermogen", "vooruitontvangen"],
        getMutaties: (b) => ({ debiteuren: b.totaal - b.vooruit, eigenVermogen: b.totaal, vooruitontvangen: -b.vooruit }),
        resultaat: (b) => ({ opbrengsten: b.totaal }),
        liquiditeit: {},
        hints: [
          "Dienst geleverd: aanbetaling wordt opbrengst, rest wordt debiteur.",
          "Debiteuren +rest, EV +totaal, Vooruitontvangen -vooruit.",
          "Drie posten muteren!"
        ],
        kernprincipe: "Bij levering wordt vooruitbetaling omgezet in opbrengst!"
      },
      {
        datum: "28 januari",
        getOmschrijving: (b) => `Afschrijving op hotelpand en inventaris: €${b.afschrijving.toLocaleString()}.`,
        getDetail: () => "Maandelijkse afschrijving.",
        bedragen: { afschrijving: 3500 },
        correctePosten: ["vasteActiva", "eigenVermogen"],
        getMutaties: (b) => ({ vasteActiva: -b.afschrijving, eigenVermogen: -b.afschrijving }),
        resultaat: (b) => ({ afschrijving: b.afschrijving }),
        liquiditeit: {},
        hints: [
          "Waardevermindering gebouw en inventaris.",
          "VA dalen, EV daalt.",
          "VA -bedrag, EV -bedrag"
        ],
        kernprincipe: "Afschrijving: KOST maar geen UITGAVE!"
      },
      {
        datum: "31 januari",
        getOmschrijving: (b) => `Aflossing €${b.aflossing.toLocaleString()} en rente €${b.rente.toLocaleString()} op de hypotheek.`,
        getDetail: () => "Afgeschreven van de bank.",
        bedragen: { aflossing: 2500, rente: 800 },
        correctePosten: ["bank", "lening", "eigenVermogen"],
        getMutaties: (b) => ({ bank: -(b.aflossing + b.rente), lening: -b.aflossing, eigenVermogen: -b.rente }),
        resultaat: (b) => ({ rente: b.rente }),
        liquiditeit: (b) => ({ uitgaven: b.aflossing + b.rente }),
        hints: [
          "Aflossing = geen kost, rente = wel kost.",
          "Bank daalt totaal, lening daalt aflossing, EV daalt rente.",
          "Bank -(afl+rente), Lening -afl, EV -rente"
        ],
        kernprincipe: "Aflossing ≠ kost, Rente = kost!"
      }
    ]
  },
  {
    id: 'shortstay',
    naam: 'StayNow',
    emoji: '🏠',
    beschrijving: 'Online platform voor short-stay verhuur (zoals Airbnb)',
    kleur: 'rose',
    openingsBalans: {
      vasteActiva: 12000,
      voorraad: 0,
      debiteuren: 35000,
      bank: 85000,
      kas: 0,
      eigenVermogen: 95000,
      lening: 25000,
      crediteuren: 12000,
      vooruitontvangen: 0
    },
    transacties: [
      {
        datum: "3 januari",
        getOmschrijving: (b) => `Gasten boeken via het platform voor €${b.boekingen.toLocaleString()}. StayNow ontvangt 15% commissie.`,
        getDetail: (b) => `Commissie: €${b.commissie.toLocaleString()}. Gasten betalen direct via iDEAL.`,
        bedragen: { boekingen: 45000, commissie: 6750 },
        correctePosten: ["bank", "crediteuren", "eigenVermogen"],
        getMutaties: (b) => ({ bank: b.boekingen, crediteuren: b.boekingen - b.commissie, eigenVermogen: b.commissie }),
        resultaat: (b) => ({ opbrengsten: b.commissie }),
        liquiditeit: (b) => ({ ontvangsten: b.boekingen }),
        hints: [
          "Het hele bedrag komt binnen, maar alleen de commissie is opbrengst!",
          "Bank +totaal, Crediteuren +uit te betalen aan hosts, EV +commissie.",
          "Je houdt geld van hosts vast = schuld aan hen!"
        ],
        kernprincipe: "Platform: alleen de COMMISSIE is opbrengst, rest is schuld aan hosts!"
      },
      {
        datum: "8 januari",
        getOmschrijving: (b) => `StayNow betaalt €${b.uitbetaling.toLocaleString()} uit aan verhuurders (hosts).`,
        getDetail: () => "Wekelijkse uitbetaling van afgeronde boekingen.",
        bedragen: { uitbetaling: 28000 },
        correctePosten: ["bank", "crediteuren"],
        getMutaties: (b) => ({ bank: -b.uitbetaling, crediteuren: -b.uitbetaling }),
        resultaat: {},
        liquiditeit: (b) => ({ uitgaven: b.uitbetaling }),
        hints: [
          "Geld naar de hosts. Is dit een kost voor StayNow?",
          "Bank daalt, schuld aan hosts daalt.",
          "Bank -bedrag, Crediteuren -bedrag"
        ],
        kernprincipe: "Uitbetaling aan hosts is GEEN kost — het was hun geld!"
      },
      {
        datum: "12 januari",
        getOmschrijving: (b) => `Een zakelijke klant boekt accommodaties voor €${b.verkoop.toLocaleString()}. Factuur gestuurd.`,
        getDetail: (b) => `Commissie StayNow: €${b.commissie.toLocaleString()}. Betaling binnen 14 dagen.`,
        bedragen: { verkoop: 12000, commissie: 1800 },
        correctePosten: ["debiteuren", "crediteuren", "eigenVermogen"],
        getMutaties: (b) => ({ debiteuren: b.verkoop, crediteuren: b.verkoop - b.commissie, eigenVermogen: b.commissie }),
        resultaat: (b) => ({ opbrengsten: b.commissie }),
        liquiditeit: {},
        hints: [
          "Zakelijke boeking op rekening. Commissie is opbrengst, rest is voor hosts.",
          "Debiteuren +totaal, Crediteuren +hostdeel, EV +commissie.",
          "Debiteuren +verkoop, Crediteuren +(verkoop-commissie), EV +commissie"
        ],
        kernprincipe: "B2B boeking: OPBRENGST (commissie) maar nog geen ONTVANGST!"
      },
      {
        datum: "15 januari",
        getOmschrijving: (b) => `Debiteuren betalen openstaande facturen: €${b.betaling.toLocaleString()}.`,
        getDetail: () => "Op de bank.",
        bedragen: { betaling: 40000 },
        correctePosten: ["bank", "debiteuren"],
        getMutaties: (b) => ({ bank: b.betaling, debiteuren: -b.betaling }),
        resultaat: {},
        liquiditeit: (b) => ({ ontvangsten: b.betaling }),
        hints: [
          "Geld komt binnen van debiteuren.",
          "Bank stijgt, debiteuren dalen.",
          "Bank +bedrag, Debiteuren -bedrag"
        ],
        kernprincipe: "ONTVANGST zonder OPBRENGST!"
      },
      {
        datum: "22 januari",
        getOmschrijving: (b) => `Aflossing van €${b.aflossing.toLocaleString()} op de bedrijfslening.`,
        getDetail: () => "Maandelijkse aflossing.",
        bedragen: { aflossing: 2000 },
        correctePosten: ["bank", "lening"],
        getMutaties: (b) => ({ bank: -b.aflossing, lening: -b.aflossing }),
        resultaat: {},
        liquiditeit: (b) => ({ uitgaven: b.aflossing }),
        hints: [
          "Aflossen is geen kost!",
          "Bank daalt, lening daalt.",
          "Bank -bedrag, Lening -bedrag"
        ],
        kernprincipe: "Aflossen: GEEN kost!"
      },
      {
        datum: "28 januari",
        getOmschrijving: (b) => `Afschrijving op servers en software: €${b.afschrijving.toLocaleString()}.`,
        getDetail: () => "Maandelijkse afschrijving.",
        bedragen: { afschrijving: 400 },
        correctePosten: ["vasteActiva", "eigenVermogen"],
        getMutaties: (b) => ({ vasteActiva: -b.afschrijving, eigenVermogen: -b.afschrijving }),
        resultaat: (b) => ({ afschrijving: b.afschrijving }),
        liquiditeit: {},
        hints: [
          "Waardevermindering IT-infrastructuur.",
          "VA dalen, EV daalt.",
          "VA -bedrag, EV -bedrag"
        ],
        kernprincipe: "Afschrijving: KOST maar geen UITGAVE!"
      },
      {
        datum: "31 januari",
        getOmschrijving: (b) => `Rentebetaling van €${b.rente.toLocaleString()} over de lening.`,
        getDetail: () => "Afgeschreven van de bank.",
        bedragen: { rente: 180 },
        correctePosten: ["bank", "eigenVermogen"],
        getMutaties: (b) => ({ bank: -b.rente, eigenVermogen: -b.rente }),
        resultaat: (b) => ({ rente: b.rente }),
        liquiditeit: (b) => ({ uitgaven: b.rente }),
        hints: [
          "Rente is kost én uitgave.",
          "Bank daalt, EV daalt.",
          "Bank -bedrag, EV -bedrag"
        ],
        kernprincipe: "Rente: KOST én UITGAVE!"
      }
    ]
  }
];
// ============================================================
// HELPER FUNCTIES
// ============================================================

const randomizeTransacties = (transactions, openingsBalans) => {
  const randomized = [];

  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    const bedragen = {};

    // Randomiseer onafhankelijke bedragen
    Object.keys(tx.bedragen).forEach(key => {
      if (!tx.linkedBedragen || !tx.linkedBedragen[key]) {
        const base = tx.bedragen[key];
        const variation = 0.15;
        const multiplier = 1 + (Math.random() * 2 - 1) * variation;
        bedragen[key] = Math.round(base * multiplier / 10) * 10;
      }
    });

    // Kopieer gekoppelde bedragen
    if (tx.linkedBedragen) {
      Object.keys(tx.linkedBedragen).forEach(key => {
        const link = tx.linkedBedragen[key];

        if (link.type === 'transaction') {
          // Kopieer van eerdere transactie
          bedragen[key] = randomized[link.txIndex].bedragen[link.key];

          // Als er een subtract is, trek dat ook af
          if (link.subtract) {
            bedragen[key] -= randomized[link.txIndex].bedragen[link.subtract];
          }
        } else if (link.type === 'opening') {
          // Kopieer van opening balance
          bedragen[key] = openingsBalans[link.account];
        }
      });
    }

    randomized.push({ ...tx, bedragen });
  }

  return randomized;
};

const randomizeBedragen = (bedragen) => {
  const result = {};
  Object.keys(bedragen).forEach(key => {
    const base = bedragen[key];
    const variation = 0.15;
    const multiplier = 1 + (Math.random() * 2 - 1) * variation;
    result[key] = Math.round(base * multiplier / 10) * 10;
  });
  return result;
};

const randomizeBalans = (balans) => {
  const result = {};
  Object.keys(balans).forEach(key => {
    const base = balans[key];
    const variation = 0.10;
    const multiplier = 1 + (Math.random() * 2 - 1) * variation;
    result[key] = Math.round(base * multiplier / 100) * 100;
  });
  const totaalActiva = result.vasteActiva + result.voorraad + result.debiteuren + result.bank + result.kas;
  const totaalPassivaZonderEV = result.lening + result.crediteuren;
  result.eigenVermogen = totaalActiva - totaalPassivaZonderEV;
  return result;
};

const postLabels = {
  vasteActiva: "Vaste activa",
  voorraad: "Voorraad",
  debiteuren: "Debiteuren",
  bank: "Bank",
  kas: "Kas",
  eigenVermogen: "Eigen vermogen",
  lening: "Lening",
  crediteuren: "Crediteuren",
  vooruitontvangen: "Vooruitontvangen bedragen"
};

// ============================================================
// PDF GENERATIE FUNCTIE
// ============================================================

const generatePDF = (bedrijf, openingsBalans, transacties) => {
  const doc = new jsPDF();

  // Titel pagina
  doc.setFontSize(20);
  doc.text(`Boekhoudoefening: ${bedrijf.naam}`, 105, 20, { align: 'center' });

  doc.setFontSize(12);
  doc.text(bedrijf.beschrijving, 105, 30, { align: 'center' });
  doc.text('Boek alle transacties correct en bereken de eindbalans', 105, 37, { align: 'center' });

  // Beginbalans
  doc.setFontSize(14);
  doc.text('Beginbalans januari', 20, 50);

  const balansData = [
    ['ACTIVA', '', 'PASSIVA', ''],
    ['Vaste activa', `€${openingsBalans.vasteActiva.toLocaleString()}`, 'Eigen vermogen', `€${openingsBalans.eigenVermogen.toLocaleString()}`],
    ['Voorraad', `€${openingsBalans.voorraad.toLocaleString()}`, 'Lening', `€${openingsBalans.lening.toLocaleString()}`],
    ['Debiteuren', `€${openingsBalans.debiteuren.toLocaleString()}`, 'Crediteuren', `€${openingsBalans.crediteuren.toLocaleString()}`],
    ['Bank', `€${openingsBalans.bank.toLocaleString()}`, '', ''],
    ['Kas', `€${openingsBalans.kas.toLocaleString()}`, '', ''],
    ['', '', '', ''],
    ['Totaal activa', `€${(openingsBalans.vasteActiva + openingsBalans.voorraad + openingsBalans.debiteuren + openingsBalans.bank + openingsBalans.kas).toLocaleString()}`,
     'Totaal passiva', `€${(openingsBalans.eigenVermogen + openingsBalans.lening + openingsBalans.crediteuren).toLocaleString()}`]
  ];

  doc.autoTable({
    startY: 55,
    head: [],
    body: balansData,
    theme: 'grid',
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 45, fontStyle: 'bold' },
      1: { cellWidth: 40, halign: 'right' },
      2: { cellWidth: 45, fontStyle: 'bold' },
      3: { cellWidth: 40, halign: 'right' }
    }
  });

  // Transacties
  doc.setFontSize(14);
  const yPos = doc.lastAutoTable.finalY + 15;
  doc.text('Transacties', 20, yPos);

  let currentY = yPos + 10;
  transacties.forEach((tx, i) => {
    const b = tx.bedragen;
    const omschrijving = tx.getOmschrijving(b);
    const detail = tx.getDetail ? tx.getDetail(b) : '';

    // Check of we een nieuwe pagina nodig hebben
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(`${i + 1}. ${tx.datum}`, 20, currentY);

    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);

    // Omschrijving (met text wrapping)
    const splitOmschrijving = doc.splitTextToSize(omschrijving, 170);
    doc.text(splitOmschrijving, 20, currentY + 6);
    currentY += 6 + (splitOmschrijving.length * 5);

    if (detail) {
      doc.setTextColor(100);
      const splitDetail = doc.splitTextToSize(detail, 170);
      doc.text(splitDetail, 20, currentY);
      currentY += splitDetail.length * 5;
      doc.setTextColor(0);
    }

    currentY += 8;
  });

  // Nieuwe pagina voor uitwerking
  doc.addPage();
  doc.setFontSize(16);
  doc.text('Uitwerking', 105, 20, { align: 'center' });

  currentY = 35;

  transacties.forEach((tx, i) => {
    const b = tx.bedragen;
    const omschrijving = tx.getOmschrijving(b);
    const mutaties = tx.getMutaties(b);

    // Check nieuwe pagina
    if (currentY > 240) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(`${i + 1}. ${tx.datum}`, 20, currentY);

    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    const splitOmschrijving = doc.splitTextToSize(omschrijving, 170);
    doc.text(splitOmschrijving, 20, currentY + 5);
    currentY += 5 + (splitOmschrijving.length * 4);

    // Mutaties tabel
    const mutatiesData = Object.entries(mutaties).map(([post, bedrag]) => {
      const label = postLabels[post];
      const sign = bedrag >= 0 ? '+' : '';
      return [label, `${sign}€${Math.abs(bedrag).toLocaleString()}`];
    });

    doc.autoTable({
      startY: currentY,
      head: [['Rekening', 'Mutatie']],
      body: mutatiesData,
      theme: 'striped',
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 60 },
        1: { cellWidth: 40, halign: 'right' }
      },
      margin: { left: 25 }
    });

    currentY = doc.lastAutoTable.finalY + 3;

    // Uitleg (kernprincipe)
    doc.setFontSize(9);
    doc.setFont(undefined, 'italic');
    doc.setTextColor(50);
    const splitPrincipe = doc.splitTextToSize(`💡 ${tx.kernprincipe}`, 165);
    doc.text(splitPrincipe, 25, currentY);
    currentY += splitPrincipe.length * 4 + 8;
    doc.setTextColor(0);
    doc.setFont(undefined, 'normal');
  });

  // Save PDF
  const datum = new Date().toISOString().split('T')[0];
  doc.save(`Boekhoudoefening-${bedrijf.naam.replace(/\s+/g, '-')}-${datum}.pdf`);
};

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function BoekhoudingGame() {
  const gameData = useMemo(() => {
    const bedrijf = bedrijven[Math.floor(Math.random() * bedrijven.length)];
    const openingsBalans = randomizeBalans(bedrijf.openingsBalans);
    const transacties = randomizeTransacties(bedrijf.transacties, openingsBalans);
    return { bedrijf, openingsBalans, transacties };
  }, []);

  const { bedrijf, openingsBalans, transacties } = gameData;

  const [gameState, setGameState] = useState('intro');
  const [currentTx, setCurrentTx] = useState(0);
  const [balans, setBalans] = useState({...openingsBalans});
  const [resultaat, setResultaat] = useState({ opbrengsten: 0, kostprijs: 0, afschrijving: 0, rente: 0, overig: 0 });
  const [liquiditeit, setLiquiditeit] = useState({ 
    beginsaldo: openingsBalans.bank + openingsBalans.kas, 
    ontvangsten: 0, 
    uitgaven: 0 
  });
  const [selectedPosten, setSelectedPosten] = useState([]);
  const [inputMutaties, setInputMutaties] = useState({});
  const [hintLevel, setHintLevel] = useState(0);
  const [score, setScore] = useState(0);
  const [perfecte, setPerfecte] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const [animatingPosten, setAnimatingPosten] = useState([]);
  const [completeTab, setCompleteTab] = useState('Score');
  const [timeLeft, setTimeLeft] = useState(180); // Start met 3 minuten
  const [timedOut, setTimedOut] = useState(false);
  const [timeoutCount, setTimeoutCount] = useState(0);

  // Tijd per transactie: 1-3 = 3 min, 4-6 = 2 min, 7 = 1 min
  const getTimeLimit = (txIndex) => {
    if (txIndex < 3) return 180; // 3 minuten
    if (txIndex < 6) return 120; // 2 minuten
    return 60; // 1 minuut
  };

  const tx = transacties[currentTx];
  
  // Get dynamic text
  const omschrijving = tx.getOmschrijving(tx.bedragen);
  const detail = tx.getDetail ? tx.getDetail(tx.bedragen) : "";

  // Timer effect
  React.useEffect(() => {
    if (gameState !== 'playing') return;
    
    if (timeLeft <= 0) {
      // Tijd is op - toon juiste antwoorden
      handleTimeout();
      return;
    }
    
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft, gameState]);

  const handleTimeout = () => {
    setTimedOut(true);
    setTimeoutCount(prev => prev + 1);
    const correcteMut = tx.getMutaties(tx.bedragen);
    
    // Update balans met correcte mutaties
    const newBalans = {...balans};
    Object.keys(correcteMut).forEach(post => {
      newBalans[post] += correcteMut[post];
    });
    
    // Update resultaat
    const newResultaat = {...resultaat};
    const txResultaat = typeof tx.resultaat === 'function' ? tx.resultaat(tx.bedragen) : tx.resultaat;
    if (txResultaat.opbrengsten) newResultaat.opbrengsten += txResultaat.opbrengsten;
    if (txResultaat.kostprijs) newResultaat.kostprijs += txResultaat.kostprijs;
    if (txResultaat.afschrijving) newResultaat.afschrijving += txResultaat.afschrijving;
    if (txResultaat.rente) newResultaat.rente += txResultaat.rente;
    if (txResultaat.overig) newResultaat.overig += txResultaat.overig;
    
    // Update liquiditeit
    const newLiquiditeit = {...liquiditeit};
    const txLiquiditeit = typeof tx.liquiditeit === 'function' ? tx.liquiditeit(tx.bedragen) : tx.liquiditeit;
    if (txLiquiditeit.ontvangsten) newLiquiditeit.ontvangsten += txLiquiditeit.ontvangsten;
    if (txLiquiditeit.uitgaven) newLiquiditeit.uitgaven += txLiquiditeit.uitgaven;
    
    setBalans(newBalans);
    setResultaat(newResultaat);
    setLiquiditeit(newLiquiditeit);
    setFeedback({ type: 'timeout', message: 'Tijd is op! Dit waren de juiste mutaties:', punten: 0 });
    setGameState('feedback');
  };

  const resetGame = () => {
    window.location.reload();
  };

  const startGame = () => {
    setGameState('playing');
  };

  const togglePost = (post) => {
    if (gameState !== 'playing') return;
    
    if (selectedPosten.includes(post)) {
      setSelectedPosten(prev => prev.filter(p => p !== post));
      setInputMutaties(prev => {
        const newInput = {...prev};
        delete newInput[post];
        return newInput;
      });
    } else {
      setSelectedPosten(prev => [...prev, post]);
      setInputMutaties(prev => ({
        ...prev,
        [post]: { bedrag: '', richting: '+' }
      }));
    }
    setFeedback(null);
  };

  const updateInput = (post, field, value) => {
    setInputMutaties(prev => ({
      ...prev,
      [post]: { ...prev[post], [field]: value }
    }));
  };

  const controleerMutaties = () => {
    const correct = tx.correctePosten;
    const correcteMut = tx.getMutaties(tx.bedragen);
    const selected = selectedPosten;
    
    const postenCorrect = correct.every(p => selected.includes(p)) && 
                          selected.every(p => correct.includes(p));
    
    if (!postenCorrect) {
      const missing = correct.filter(p => !selected.includes(p));
      const extra = selected.filter(p => !correct.includes(p));
      
      let msg = "";
      if (missing.length > 0 && extra.length > 0) {
        msg = `Je mist nog ${missing.length} post(en) en hebt ${extra.length} te veel.`;
      } else if (missing.length > 0) {
        msg = `Je mist nog ${missing.length} post(en).`;
      } else {
        msg = `Je hebt ${extra.length} post(en) te veel geselecteerd.`;
      }
      setFeedback({ type: 'error', message: msg });
      return;
    }
    
    let allCorrect = true;
    let errors = [];

    Object.keys(correcteMut).forEach(post => {
      const expected = correcteMut[post];
      const input = inputMutaties[post];
      const bedrag = parseInt(input?.bedrag) || 0;
      const actualValue = input?.richting === '-' ? -bedrag : bedrag;
      
      if (actualValue !== expected) {
        allCorrect = false;
        if (bedrag === 0) {
          errors.push(`${postLabels[post]}: vul een bedrag in.`);
        } else if (bedrag === Math.abs(expected) && actualValue !== expected) {
          errors.push(`${postLabels[post]}: richting is verkeerd!`);
        } else {
          errors.push(`${postLabels[post]}: bedrag klopt niet.`);
        }
      }
    });

    if (allCorrect) {
      const punten = hintLevel === 0 ? 30 : hintLevel === 1 ? 20 : hintLevel === 2 ? 10 : 5;
      setScore(prev => prev + punten);
      if (hintLevel === 0) setPerfecte(prev => prev + 1);
      
      const newBalans = {...balans};
      Object.keys(correcteMut).forEach(post => {
        newBalans[post] += correcteMut[post];
      });
      
      const newResultaat = {...resultaat};
      const txResultaat = typeof tx.resultaat === 'function' ? tx.resultaat(tx.bedragen) : tx.resultaat;
      if (txResultaat.opbrengsten) newResultaat.opbrengsten += txResultaat.opbrengsten;
      if (txResultaat.kostprijs) newResultaat.kostprijs += txResultaat.kostprijs;
      if (txResultaat.afschrijving) newResultaat.afschrijving += txResultaat.afschrijving;
      if (txResultaat.rente) newResultaat.rente += txResultaat.rente;
      if (txResultaat.overig) newResultaat.overig += txResultaat.overig;
      
      const newLiquiditeit = {...liquiditeit};
      const txLiquiditeit = typeof tx.liquiditeit === 'function' ? tx.liquiditeit(tx.bedragen) : tx.liquiditeit;
      if (txLiquiditeit.ontvangsten) newLiquiditeit.ontvangsten += txLiquiditeit.ontvangsten;
      if (txLiquiditeit.uitgaven) newLiquiditeit.uitgaven += txLiquiditeit.uitgaven;
      
      setAnimatingPosten(Object.keys(correcteMut));
      setTimeout(() => {
        setBalans(newBalans);
        setResultaat(newResultaat);
        setLiquiditeit(newLiquiditeit);
        setAnimatingPosten([]);
      }, 300);
      
      setFeedback({ type: 'success', message: 'Correct!', punten });
      setGameState('feedback');
    } else {
      setFeedback({ type: 'error', message: errors.join(' ') });
    }
  };

  const gebruikHint = () => {
    if (hintLevel < 3) {
      setHintLevel(prev => prev + 1);
      setShowHint(true);
    }
  };

  const volgendeTransactie = () => {
    if (currentTx < transacties.length - 1) {
      const nextTx = currentTx + 1;
      setCurrentTx(nextTx);
      setSelectedPosten([]);
      setInputMutaties({});
      setHintLevel(0);
      setFeedback(null);
      setShowHint(false);
      setGameState('playing');
      setTimeLeft(getTimeLimit(nextTx)); // Tijd op basis van transactienummer
      setTimedOut(false);
    } else {
      setGameState('complete');
    }
  };

  const totaalActiva = balans.vasteActiva + balans.voorraad + balans.debiteuren + balans.bank + balans.kas;
  const totaalPassiva = balans.eigenVermogen + balans.lening + balans.crediteuren;
  const totaalActivaBegin = openingsBalans.vasteActiva + openingsBalans.voorraad + openingsBalans.debiteuren + openingsBalans.bank + openingsBalans.kas;
  const totaalPassivaBegin = openingsBalans.eigenVermogen + openingsBalans.lening + openingsBalans.crediteuren;
  const brutowinst = resultaat.opbrengsten - resultaat.kostprijs;
  const nettowinst = brutowinst - resultaat.afschrijving - resultaat.rente - resultaat.overig;
  const eindsaldoLiq = liquiditeit.beginsaldo + liquiditeit.ontvangsten - liquiditeit.uitgaven;

  const cardStyle = "bg-gray-900 border border-gray-700 rounded-lg p-4";
  const buttonPrimary = "bg-pink-600 hover:bg-pink-700 text-white font-semibold py-2 px-6 rounded transition-colors";
  const buttonSecondary = "bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded transition-colors";

  // INTRO SCREEN
  if (gameState === 'intro') {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center">
        <div className="max-w-2xl text-center">
          <h1 className="text-4xl font-bold text-pink-500 mb-2">Boek 't!</h1>
          <p className="text-gray-400 mb-6">Verwerk transacties, snap de balans</p>
          
          <div className="text-6xl mb-4">{bedrijf.emoji}</div>
          <h2 className="text-2xl font-bold text-white mb-2">{bedrijf.naam}</h2>
          <p className="text-gray-400 mb-6">{bedrijf.beschrijving}</p>
          
          <div className={`${cardStyle} text-left mb-6`}>
            <h2 className="text-pink-500 font-semibold mb-3">Jouw opdracht</h2>
            <p className="text-gray-300 mb-4">
              Verwerk alle transacties van januari. Bij elke transactie:
            </p>
            <ol className="space-y-2 text-gray-300 text-sm">
              <li>1. Klik op de balansposten die veranderen</li>
              <li>2. Vul per post het bedrag in (+ of -)</li>
              <li>3. Controleer je antwoord</li>
            </ol>
          </div>

          <div className={`${cardStyle} text-left mb-6`}>
            <h2 className="text-pink-500 font-semibold mb-3">Openingsbalans 1 januari</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-400 text-xs mb-1">ACTIVA</div>
                <div className="space-y-1">
                  <div className="flex justify-between"><span>Vaste activa</span><span>€{openingsBalans.vasteActiva.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Voorraad</span><span>€{openingsBalans.voorraad.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Debiteuren</span><span>€{openingsBalans.debiteuren.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Bank</span><span>€{openingsBalans.bank.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Kas</span><span>€{openingsBalans.kas.toLocaleString()}</span></div>
                  <div className="flex justify-between border-t border-pink-500 pt-1 mt-1 font-semibold">
                    <span>Totaal</span>
                    <span className="text-pink-400">€{(openingsBalans.vasteActiva + openingsBalans.voorraad + openingsBalans.debiteuren + openingsBalans.bank + openingsBalans.kas).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-gray-400 text-xs mb-1">PASSIVA</div>
                <div className="space-y-1">
                  <div className="flex justify-between"><span>Eigen vermogen</span><span>€{openingsBalans.eigenVermogen.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Lening</span><span>€{openingsBalans.lening.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span>Crediteuren</span><span>€{openingsBalans.crediteuren.toLocaleString()}</span></div>
                  <div className="invisible"><span>Spacer</span></div>
                  <div className="invisible"><span>Spacer</span></div>
                  <div className="flex justify-between border-t border-pink-500 pt-1 mt-1 font-semibold">
                    <span>Totaal</span>
                    <span className="text-pink-400">€{(openingsBalans.eigenVermogen + openingsBalans.lening + openingsBalans.crediteuren).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button onClick={startGame} className={`${buttonPrimary} text-lg px-8 py-3`}>
            Start januari ▶
          </button>
        </div>
      </div>
    );
  }

  // COMPLETE SCREEN
  if (gameState === 'complete') {
    const maxScore = transacties.length * 30;
    const percentage = Math.round((score / maxScore) * 100);
    const eindEV = balans.eigenVermogen;
    const beginEV = openingsBalans.eigenVermogen;
    const evMutatie = eindEV - beginEV;
    const kasMutatie = eindsaldoLiq - liquiditeit.beginsaldo;
    
    let rank = "Leerling-boekhouder";
    if (percentage >= 90) rank = "Meester-boekhouder ⭐⭐⭐";
    else if (percentage >= 70) rank = "Senior boekhouder ⭐⭐";
    else if (percentage >= 50) rank = "Junior boekhouder ⭐";

    const tabs = ['Score', 'Balans', 'Resultaat', 'Liquiditeit'];

    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-pink-500 mb-1">Boek 't!</h1>
            <div className="text-5xl mb-2">{bedrijf.emoji}</div>
            <h2 className="text-xl font-bold text-white">🎉 JANUARI VOLTOOID!</h2>
            <p className="text-gray-400">{bedrijf.naam}</p>
          </div>

          {/* Tabs */}
          <div className="flex justify-center gap-2 mb-6">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setCompleteTab(tab)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors
                  ${completeTab === tab 
                    ? 'bg-pink-600 text-white' 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {completeTab === 'Score' && (
            <div className="space-y-4">
              <div className={`${cardStyle} text-center`}>
                <div className="text-5xl font-bold text-pink-500 mb-2">{score}/{maxScore}</div>
                <div className="text-gray-400 mb-4">punten ({percentage}%)</div>
                <div className="text-2xl text-white mb-2">{rank}</div>
                <div className="text-gray-400">Perfecte verwerkingen: {perfecte}/{transacties.length}</div>
                {timeoutCount > 0 && (
                  <div className="text-orange-400 text-sm mt-1">⏱️ Tijd verlopen: {timeoutCount}x</div>
                )}
              </div>

              <div className={`${cardStyle}`}>
                <h2 className="text-pink-500 font-semibold mb-4">Samenvatting</h2>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-gray-400 text-sm">Eigen vermogen</div>
                    <div className="text-white">€{beginEV.toLocaleString()} → €{eindEV.toLocaleString()}</div>
                    <div className={`text-lg font-semibold ${evMutatie >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {evMutatie >= 0 ? '+' : ''}€{evMutatie.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-sm">Liquiditeit (bank + kas)</div>
                    <div className="text-white">€{liquiditeit.beginsaldo.toLocaleString()} → €{eindsaldoLiq.toLocaleString()}</div>
                    <div className={`text-lg font-semibold ${kasMutatie >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {kasMutatie >= 0 ? '+' : ''}€{kasMutatie.toLocaleString()}
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 p-3 bg-gray-800 rounded border-l-4 border-pink-500">
                  <div className="text-pink-400 font-semibold">💡 Belangrijke inzicht</div>
                  <div className="text-gray-300 text-sm mt-1">
                    Winst (€{nettowinst.toLocaleString()}) ≠ Kasmutatie (€{kasMutatie.toLocaleString()})
                  </div>
                </div>
              </div>
            </div>
          )}

          {completeTab === 'Balans' && (
            <div className={cardStyle}>
              <h2 className="text-pink-500 font-semibold mb-4 text-center">Balans januari</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Activa */}
                <div>
                  <div className="text-gray-400 text-xs mb-3 uppercase font-semibold">Activa</div>

                  {/* Header rij */}
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 mb-2 pb-1 border-b border-gray-700">
                    <div className="text-left">Rekening</div>
                    <div className="text-right">Beginbalans</div>
                    <div className="text-right">Eindbalans</div>
                  </div>

                  {/* Account rijen */}
                  <div className="space-y-2">
                    {['vasteActiva', 'voorraad', 'debiteuren', 'bank', 'kas'].map(account => (
                      <div key={account} className="grid grid-cols-3 gap-2 text-sm py-1">
                        <div className="text-left truncate">{postLabels[account]}</div>
                        <div className="text-right font-mono text-gray-400">
                          €{openingsBalans[account].toLocaleString()}
                        </div>
                        <div className="text-right font-mono font-semibold">
                          €{balans[account].toLocaleString()}
                        </div>
                      </div>
                    ))}

                    {/* Totaal rij */}
                    <div className="grid grid-cols-3 gap-2 pt-2 mt-2 border-t-2 border-pink-500 font-semibold">
                      <div>Totaal activa</div>
                      <div className="text-right font-mono text-gray-400">
                        €{totaalActivaBegin.toLocaleString()}
                      </div>
                      <div className="text-right font-mono text-pink-400">
                        €{totaalActiva.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Passiva */}
                <div>
                  <div className="text-gray-400 text-xs mb-3 uppercase font-semibold">Passiva</div>

                  {/* Header rij */}
                  <div className="grid grid-cols-3 gap-2 text-xs text-gray-500 mb-2 pb-1 border-b border-gray-700">
                    <div className="text-left">Rekening</div>
                    <div className="text-right">Beginbalans</div>
                    <div className="text-right">Eindbalans</div>
                  </div>

                  {/* Account rijen */}
                  <div className="space-y-2">
                    {['eigenVermogen', 'lening', 'crediteuren'].map(account => (
                      <div key={account} className="grid grid-cols-3 gap-2 text-sm py-1">
                        <div className="text-left truncate">{postLabels[account]}</div>
                        <div className="text-right font-mono text-gray-400">
                          €{openingsBalans[account].toLocaleString()}
                        </div>
                        <div className="text-right font-mono font-semibold">
                          €{balans[account].toLocaleString()}
                        </div>
                      </div>
                    ))}

                    {/* Spacers voor alignment */}
                    <div className="py-1 invisible">
                      <span>Spacer</span>
                    </div>
                    <div className="py-1 invisible">
                      <span>Spacer</span>
                    </div>

                    {/* Totaal rij */}
                    <div className="grid grid-cols-3 gap-2 pt-2 mt-2 border-t-2 border-pink-500 font-semibold">
                      <div>Totaal passiva</div>
                      <div className="text-right font-mono text-gray-400">
                        €{totaalPassivaBegin.toLocaleString()}
                      </div>
                      <div className="text-right font-mono text-pink-400">
                        €{totaalPassiva.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-3 bg-gray-800 rounded text-center">
                <span className="text-green-400">✓ Balans in evenwicht: Activa = Passiva</span>
              </div>
            </div>
          )}

          {completeTab === 'Resultaat' && (
            <div className={cardStyle}>
              <h2 className="text-pink-500 font-semibold mb-4 text-center">Resultatenrekening januari</h2>
              <div className="max-w-md mx-auto space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-700">
                  <span>Opbrengsten</span>
                  <span className="font-mono text-green-400">€{resultaat.opbrengsten.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-700">
                  <span>Kostprijs omzet</span>
                  <span className="font-mono text-red-400">-€{resultaat.kostprijs.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-700 font-semibold">
                  <span>Brutowinst</span>
                  <span className="font-mono">€{brutowinst.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-400">Afschrijvingen</span>
                  <span className="font-mono text-red-400">-€{resultaat.afschrijving.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-400">Rentekosten</span>
                  <span className="font-mono text-red-400">-€{resultaat.rente.toLocaleString()}</span>
                </div>
                {resultaat.overig > 0 && (
                  <div className="flex justify-between py-2">
                    <span className="text-gray-400">Overige kosten</span>
                    <span className="font-mono text-red-400">-€{resultaat.overig.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between py-3 border-t-2 border-pink-500 mt-2">
                  <span className="font-bold text-lg">Nettowinst</span>
                  <span className={`font-mono text-xl font-bold ${nettowinst >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    €{nettowinst.toLocaleString()}
                  </span>
                </div>
              </div>
              
              <div className="mt-6 p-3 bg-gray-800 rounded border-l-4 border-pink-500">
                <div className="text-pink-400 font-semibold">💡 Let op</div>
                <div className="text-gray-300 text-sm mt-1">
                  De nettowinst (€{nettowinst.toLocaleString()}) is gelijk aan de mutatie van het eigen vermogen 
                  (€{evMutatie.toLocaleString()}) als er geen privéopnames of kapitaalstortingen zijn geweest.
                </div>
              </div>
            </div>
          )}

          {completeTab === 'Liquiditeit' && (
            <div className={cardStyle}>
              <h2 className="text-pink-500 font-semibold mb-4 text-center">Liquiditeitsoverzicht januari</h2>
              <div className="max-w-md mx-auto space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-700">
                  <span>Beginsaldo (bank + kas)</span>
                  <span className="font-mono">€{liquiditeit.beginsaldo.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-700">
                  <span>Ontvangsten</span>
                  <span className="font-mono text-green-400">+€{liquiditeit.ontvangsten.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-700">
                  <span>Uitgaven</span>
                  <span className="font-mono text-red-400">-€{liquiditeit.uitgaven.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-3 border-t-2 border-pink-500 mt-2">
                  <span className="font-bold text-lg">Eindsaldo</span>
                  <span className="font-mono text-xl font-bold text-pink-400">€{eindsaldoLiq.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-2 text-gray-400">
                  <span>Mutatie liquiditeit</span>
                  <span className={`font-mono ${kasMutatie >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {kasMutatie >= 0 ? '+' : ''}€{kasMutatie.toLocaleString()}
                  </span>
                </div>
              </div>
              
              <div className="mt-6 p-3 bg-gray-800 rounded border-l-4 border-pink-500">
                <div className="text-pink-400 font-semibold">💡 Belangrijk verschil</div>
                <div className="text-gray-300 text-sm mt-1">
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <div className="text-white font-semibold">Winst</div>
                      <div className="text-2xl font-bold">{nettowinst >= 0 ? '+' : ''}€{nettowinst.toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-white font-semibold">Kasmutatie</div>
                      <div className="text-2xl font-bold">{kasMutatie >= 0 ? '+' : ''}€{kasMutatie.toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="mt-3 text-gray-400">
                    Verschil: €{Math.abs(nettowinst - kasMutatie).toLocaleString()} — 
                    door aflossingen, investeringen, voorraadmutaties en betalingstermijnen.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6">
            <button
              onClick={() => generatePDF(bedrijf, openingsBalans, transacties)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              📄 Download als PDF
            </button>
            <button onClick={resetGame} className={buttonPrimary}>
              Nieuw bedrijf 🎲
            </button>
          </div>
        </div>
      </div>
    );
  }

  // MAIN GAME
  return (
    <div className="min-h-screen bg-black text-white p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <span className="text-pink-500 font-bold">Boek 't!</span>
          <span className="text-gray-600">|</span>
          <span className="text-2xl">{bedrijf.emoji}</span>
          <span className="text-white font-semibold">{bedrijf.naam}</span>
          <span className="text-gray-400 text-sm">Score: {score}</span>
        </div>
        <div className="flex items-center gap-4">
          {gameState === 'playing' && (
            <span className={`font-mono text-sm px-2 py-1 rounded ${
              timeLeft <= getTimeLimit(currentTx) * 0.25 ? 'bg-red-600 text-white animate-pulse' : 
              timeLeft <= getTimeLimit(currentTx) * 0.5 ? 'bg-yellow-600 text-white' : 
              'bg-gray-700 text-gray-300'
            }`}>
              ⏱️ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
            </span>
          )}
          <span className="text-gray-400">{currentTx + 1}/{transacties.length}</span>
          <button onClick={resetGame} className="text-gray-500 hover:text-gray-300 text-sm">Nieuw</button>
        </div>
      </div>

      {/* Transactie */}
      <div className={`${cardStyle} mb-4`}>
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-pink-600 text-white text-xs px-2 py-1 rounded">TRANSACTIE {currentTx + 1}</span>
          <span className="text-gray-400 text-sm">📅 {tx.datum}</span>
        </div>
        <p className="text-white mb-2">{omschrijving}</p>
        <p className="text-gray-400 text-sm">{detail}</p>
        
        {gameState === 'playing' && (
          <p className="text-pink-400 text-sm mt-3">👆 Klik op een post om de mutatie in te vullen</p>
        )}
      </div>

      {/* Hint */}
      {showHint && hintLevel > 0 && (
        <div className="bg-gray-800 border-l-4 border-yellow-500 p-3 rounded mb-4">
          <div className="text-yellow-500 text-sm font-semibold">💡 Hint {hintLevel}</div>
          <div className="text-gray-300 text-sm">{tx.hints[hintLevel - 1]}</div>
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <div className={`p-3 rounded mb-4 ${feedback.type === 'success' ? 'bg-green-900 border border-green-700' : feedback.type === 'timeout' ? 'bg-orange-900 border border-orange-700' : 'bg-red-900 border border-red-700'}`}>
          <div className={`font-semibold ${feedback.type === 'success' ? 'text-green-400' : feedback.type === 'timeout' ? 'text-orange-400' : 'text-red-400'}`}>
            {feedback.type === 'success' ? '✅ ' : feedback.type === 'timeout' ? '⏱️ ' : '❌ '}{feedback.message}
            {feedback.type === 'success' && <span className="ml-2">+{feedback.punten} punten</span>}
          </div>
          {feedback.type === 'timeout' && (
            <div className="mt-3 space-y-1">
              {Object.entries(tx.getMutaties(tx.bedragen)).map(([post, mutatie]) => (
                <div key={post} className="flex items-center gap-2 text-sm">
                  <span className="text-orange-300">{postLabels[post]}:</span>
                  <span className={`font-mono ${mutatie >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {mutatie >= 0 ? '+' : ''}€{mutatie.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
          {(feedback.type === 'success' || feedback.type === 'timeout') && (
            <div className="text-gray-300 text-sm mt-2">
              <strong className="text-pink-400">Kernprincipe:</strong> {tx.kernprincipe}
            </div>
          )}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* BALANS */}
        <div className={`${cardStyle} lg:col-span-2`}>
          <h3 className="text-pink-500 font-semibold mb-3 text-sm uppercase">Balans</h3>
          <div className="grid grid-cols-2 gap-4 items-stretch">
            {/* Activa */}
            <div className="flex flex-col">
              <div className="text-gray-400 text-xs mb-2 uppercase">Activa</div>
              <div className="flex-1 flex flex-col">
                {['vasteActiva', 'voorraad', 'debiteuren', 'bank', 'kas'].map(post => (
                <div
                  key={post}
                  onClick={() => togglePost(post)}
                  className={`rounded mb-1 cursor-pointer transition-all
                    ${selectedPosten.includes(post) ? 'bg-pink-600 ring-2 ring-pink-400' : 'bg-gray-800 hover:bg-gray-700'}
                    ${animatingPosten.includes(post) ? 'animate-pulse bg-green-600' : ''}
                    ${gameState === 'feedback' ? 'cursor-default' : ''}`}
                >
                  <div className="flex justify-between items-center p-2">
                    <span className="text-sm">{postLabels[post]}</span>
                    <span className={`font-mono text-sm ${animatingPosten.includes(post) ? 'text-green-300' : ''}`}>
                      €{balans[post].toLocaleString()}
                    </span>
                  </div>
                  {gameState === 'playing' && selectedPosten.includes(post) && (
                    <div 
                      className="flex items-center gap-2 px-2 pb-2 pt-1 border-t border-pink-400"
                      onClick={e => e.stopPropagation()}
                    >
                      <span className="text-pink-200 text-xs">Mutatie:</span>
                      <select 
                        value={inputMutaties[post]?.richting || '+'}
                        onChange={(e) => updateInput(post, 'richting', e.target.value)}
                        className="bg-pink-700 text-white text-sm font-bold rounded px-2 py-1 cursor-pointer"
                      >
                        <option value="+">+</option>
                        <option value="-">−</option>
                      </select>
                      <span className="text-white">€</span>
                      <input
                        type="number"
                        value={inputMutaties[post]?.bedrag || ''}
                        onChange={(e) => updateInput(post, 'bedrag', e.target.value)}
                        placeholder="0"
                        className="bg-pink-800 text-white text-sm rounded px-2 py-1 w-20 text-right border border-pink-400 focus:border-white focus:outline-none"
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              ))}
              <div className="flex justify-between p-2 border-t-2 border-pink-500 mt-2">
                <span className="font-semibold text-sm">Totaal</span>
                <span className="font-mono text-pink-400">€{totaalActiva.toLocaleString()}</span>
              </div>
              </div>
            </div>
            
            {/* Passiva */}
            <div className="flex flex-col">
              <div className="text-gray-400 text-xs mb-2 uppercase">Passiva</div>
              <div className="flex-1 flex flex-col">
                {['eigenVermogen', 'lening', 'crediteuren'].map(post => (
                  <div
                    key={post}
                    onClick={() => togglePost(post)}
                    className={`rounded mb-1 cursor-pointer transition-all
                      ${selectedPosten.includes(post) ? 'bg-pink-600 ring-2 ring-pink-400' : 'bg-gray-800 hover:bg-gray-700'}
                      ${animatingPosten.includes(post) ? 'animate-pulse bg-green-600' : ''}
                      ${gameState === 'feedback' ? 'cursor-default' : ''}`}
                  >
                    <div className="flex justify-between items-center p-2">
                      <span className="text-sm">{postLabels[post]}</span>
                      <span className={`font-mono text-sm ${animatingPosten.includes(post) ? 'text-green-300' : ''}`}>
                        €{balans[post].toLocaleString()}
                      </span>
                    </div>
                    {gameState === 'playing' && selectedPosten.includes(post) && (
                      <div 
                        className="flex items-center gap-2 px-2 pb-2 pt-1 border-t border-pink-400"
                        onClick={e => e.stopPropagation()}
                      >
                        <span className="text-pink-200 text-xs">Mutatie:</span>
                        <select 
                          value={inputMutaties[post]?.richting || '+'}
                          onChange={(e) => updateInput(post, 'richting', e.target.value)}
                          className="bg-pink-700 text-white text-sm font-bold rounded px-2 py-1 cursor-pointer"
                        >
                          <option value="+">+</option>
                          <option value="-">−</option>
                        </select>
                        <span className="text-white">€</span>
                        <input
                          type="number"
                          value={inputMutaties[post]?.bedrag || ''}
                          onChange={(e) => updateInput(post, 'bedrag', e.target.value)}
                          placeholder="0"
                          className="bg-pink-800 text-white text-sm rounded px-2 py-1 w-20 text-right border border-pink-400 focus:border-white focus:outline-none"
                          autoFocus
                        />
                      </div>
                    )}
                  </div>
                ))}
                {/* Flex spacer duwt totaal naar beneden */}
                <div className="flex-1"></div>
                <div className="flex justify-between p-2 border-t-2 border-pink-500 mt-2">
                  <span className="font-semibold text-sm">Totaal</span>
                  <span className="font-mono text-pink-400">€{totaalPassiva.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
          
          {totaalActiva === totaalPassiva ? (
            <div className="text-green-500 text-center text-sm mt-2">✓ In balans</div>
          ) : (
            <div className="text-red-500 text-center text-sm mt-2">✗ Niet in balans!</div>
          )}
        </div>

        {/* Resultaat + Liquiditeit */}
        <div className="space-y-4">
          <div className={cardStyle}>
            <h3 className="text-pink-500 font-semibold mb-3 text-sm uppercase">Resultatenrekening</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between"><span>Opbrengsten</span><span className="font-mono">€{resultaat.opbrengsten.toLocaleString()}</span></div>
              <div className="flex justify-between text-gray-400"><span>Kostprijs</span><span className="font-mono">-€{resultaat.kostprijs.toLocaleString()}</span></div>
              <div className="flex justify-between border-t border-gray-700 pt-1"><span className="font-semibold">Brutowinst</span><span className="font-mono">€{brutowinst.toLocaleString()}</span></div>
              <div className="flex justify-between text-gray-400"><span>Afschrijving</span><span className="font-mono">-€{resultaat.afschrijving.toLocaleString()}</span></div>
              <div className="flex justify-between text-gray-400"><span>Rente</span><span className="font-mono">-€{resultaat.rente.toLocaleString()}</span></div>
              {resultaat.overig > 0 && <div className="flex justify-between text-gray-400"><span>Overig</span><span className="font-mono">-€{resultaat.overig.toLocaleString()}</span></div>}
              <div className="flex justify-between border-t-2 border-pink-500 pt-1">
                <span className="font-semibold text-pink-400">Nettowinst</span>
                <span className={`font-mono ${nettowinst >= 0 ? 'text-pink-400' : 'text-red-400'}`}>€{nettowinst.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className={cardStyle}>
            <h3 className="text-pink-500 font-semibold mb-3 text-sm uppercase">Liquiditeit</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-400"><span>Beginsaldo</span><span className="font-mono">€{liquiditeit.beginsaldo.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Ontvangsten</span><span className="font-mono text-green-400">+€{liquiditeit.ontvangsten.toLocaleString()}</span></div>
              <div className="flex justify-between"><span>Uitgaven</span><span className="font-mono text-red-400">-€{liquiditeit.uitgaven.toLocaleString()}</span></div>
              <div className="flex justify-between border-t-2 border-pink-500 pt-1"><span className="font-semibold text-pink-400">Eindsaldo</span><span className="font-mono text-pink-400">€{eindsaldoLiq.toLocaleString()}</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex justify-center gap-4 mt-6">
        {gameState === 'playing' && (
          <>
            {hintLevel < 3 && (
              <button onClick={gebruikHint} className={buttonSecondary}>
                💡 Hint ({3 - hintLevel})
              </button>
            )}
            <button 
              onClick={controleerMutaties} 
              disabled={selectedPosten.length === 0}
              className={`${buttonPrimary} ${selectedPosten.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Controleer ✓
            </button>
          </>
        )}
        
        {gameState === 'feedback' && (
          <button onClick={volgendeTransactie} className={buttonPrimary}>
            {currentTx < transacties.length - 1 ? 'Volgende ▶' : 'Resultaat ▶'}
          </button>
        )}
      </div>

      {/* Progress */}
      <div className="mt-6">
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-pink-600 transition-all duration-300"
            style={{ width: `${((currentTx + (gameState === 'feedback' ? 1 : 0)) / transacties.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
