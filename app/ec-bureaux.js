/* Déployé le 13/10/2026 à 16:08 — v1170 */
/* ============================================================
   ec-bureaux.js — 📍 LES BUREAUX : HORAIRES ET RENDEZ-VOUS — v1170

   David, le 13 octobre : « on a un bureau à Loudéac, il n'est pas
   tout le temps ouvert […] il me faudrait quelque chose sur ma
   vitrine pour que les gens voient les heures d'ouverture et
   puissent prendre un rendez-vous quand ils veulent passer au
   bureau ». Schéma validé le même jour.

   Gestion › L'accueil › 📍 Loudéac Horaires et RDV
                         📍 St-Brieuc Horaires et RDV
   (« Saint-Brieuc » en entier ne tient pas dans le rail.)

   · les ouvertures : celles de Drivup (créneaux « Bureau … », lus
     par le favori), et ce qu'on règle à la main, qui l'emporte —
     « on prend Drivup et si je veux changer je change » ;
   · ✏️ un jour, ➕ ouvrir un autre jour, 🔒 fermer aujourd'hui,
     ↩️ revenir à Drivup ;
   · les rendez-vous à venir, et ceux « à traiter » — tombés sur un
     jour qui a fermé sans qu'on ait dit quoi en faire ;
   · l'affiche de la vitrine (QR code et une phrase) ;
   · trois interrupteurs : reprise Drivup, page publique et QR code,
     prise de rendez-vous.

   ⚠️ UN RENDEZ-VOUS TOUCHÉ N'EST JAMAIS ANNULÉ SANS QU'ON L'AIT DIT.
   Fermer un jour, couper la page ou les rendez-vous : l'écran
   demande, un par un, « annuler et prévenir par mail » ou « je m'en
   occupe ». Sans réponse, il passe « à traiter ».

   Droit : « 📍 Horaires et rendez-vous des bureaux » (bureaux) —
   l'admin et le bureau l'ont par leur rôle.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

const BUREAUX_APPLI = {
  'loudeac':      { id: 'loudeac', vue: 'loudeac', nom: 'Loudéac', titre: 'Bureau de Loudéac',
                    page: 'https://eleve.evolutionconduites.fr/loudeac/' },
  'saint-brieuc': { id: 'saint-brieuc', vue: 'stbrieuc', nom: 'Saint-Brieuc', titre: 'Bureau de Saint-Brieuc',
                    page: 'https://eleve.evolutionconduites.fr/saint-brieuc/' }
};
const BUREAU_DE_LA_VUE = { loudeac: 'loudeac', stbrieuc: 'saint-brieuc' };
const etatDesBureaux = {};

/* Les deux QR codes, faits une fois (les adresses ne changent pas) :
   pas de bibliothèque à charger pour dessiner un carré noir et blanc. */
const QR_BUREAUX = {
  "loudeac": "<svg viewBox=\"0 0 33 33\" class=\"segno\"><path class=\"qrline\" stroke=\"#0b0b0b\" d=\"M0 0.5h7m1 0h3m2 0h4m1 0h2m1 0h4m1 0h7m-33 1h1m5 0h1m2 0h1m1 0h1m1 0h1m1 0h3m2 0h2m1 0h2m1 0h1m5 0h1m-33 1h1m1 0h3m1 0h1m1 0h1m3 0h2m1 0h1m1 0h2m3 0h2m2 0h1m1 0h3m1 0h1m-33 1h1m1 0h3m1 0h1m1 0h1m3 0h1m1 0h1m2 0h1m4 0h2m2 0h1m1 0h3m1 0h1m-33 1h1m1 0h3m1 0h1m3 0h2m3 0h1m1 0h5m1 0h1m2 0h1m1 0h3m1 0h1m-33 1h1m5 0h1m1 0h2m1 0h1m3 0h1m1 0h3m2 0h1m1 0h1m1 0h1m5 0h1m-33 1h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7m-25 1h2m2 0h1m1 0h9m1 0h1m-24 1h1m1 0h1m1 0h6m1 0h1m1 0h1m1 0h1m2 0h1m1 0h1m2 0h4m1 0h2m1 0h1m-32 1h4m4 0h1m1 0h2m1 0h1m1 0h1m3 0h1m3 0h4m3 0h2m-32 1h1m3 0h4m1 0h2m1 0h1m1 0h1m1 0h1m1 0h4m1 0h1m1 0h3m1 0h1m1 0h1m-33 1h3m5 0h3m3 0h4m1 0h1m1 0h4m1 0h1m1 0h2m-30 1h1m2 0h5m1 0h3m3 0h2m3 0h2m2 0h3m2 0h1m1 0h1m-30 1h1m4 0h3m3 0h3m1 0h1m1 0h1m1 0h1m3 0h2m1 0h1m1 0h3m-33 1h2m1 0h4m4 0h2m1 0h1m2 0h1m2 0h1m2 0h4m1 0h2m1 0h1m-32 1h1m2 0h3m1 0h2m2 0h1m2 0h1m3 0h1m2 0h2m3 0h1m4 0h1m-32 1h1m1 0h1m1 0h1m1 0h1m5 0h2m2 0h4m1 0h2m3 0h1m1 0h1m2 0h1m-29 1h2m2 0h2m1 0h1m2 0h1m1 0h3m3 0h5m1 0h1m1 0h1m1 0h1m-29 1h2m1 0h1m3 0h3m2 0h4m7 0h1m3 0h3m-33 1h1m1 0h1m1 0h2m2 0h1m1 0h2m3 0h1m4 0h2m1 0h5m3 0h2m-32 1h1m1 0h1m2 0h1m7 0h2m2 0h1m2 0h1m1 0h1m3 0h1m-25 1h1m1 0h1m2 0h1m1 0h3m1 0h2m1 0h1m2 0h2m2 0h3m4 0h2m-33 1h4m1 0h3m2 0h1m1 0h1m2 0h1m1 0h1m1 0h1m1 0h2m1 0h1m1 0h2m2 0h1m1 0h1m-32 1h1m1 0h1m1 0h1m1 0h1m3 0h2m2 0h2m2 0h3m1 0h2m1 0h4m1 0h2m-33 1h1m5 0h2m1 0h5m3 0h2m2 0h1m2 0h6m1 0h1m-24 1h4m1 0h5m1 0h6m3 0h2m2 0h1m-33 1h7m1 0h5m1 0h1m1 0h1m1 0h1m5 0h1m1 0h1m1 0h4m-32 1h1m5 0h1m1 0h3m2 0h1m2 0h1m2 0h3m2 0h1m3 0h1m2 0h2m-33 1h1m1 0h3m1 0h1m3 0h1m2 0h1m2 0h3m1 0h3m1 0h6m-30 1h1m1 0h3m1 0h1m1 0h6m2 0h1m9 0h1m1 0h2m1 0h1m-32 1h1m1 0h3m1 0h1m3 0h1m1 0h1m3 0h1m1 0h1m2 0h1m1 0h1m4 0h3m1 0h1m-33 1h1m5 0h1m1 0h1m2 0h3m6 0h2m1 0h4m-27 1h7m3 0h2m1 0h4m1 0h1m2 0h1m2 0h1m1 0h1m1 0h2m1 0h1\"/></svg>",
  "saint-brieuc": "<svg viewBox=\"0 0 33 33\" class=\"segno\"><path class=\"qrline\" stroke=\"#0b0b0b\" d=\"M0 0.5h7m1 0h2m1 0h1m1 0h2m1 0h5m2 0h2m1 0h7m-33 1h1m5 0h1m1 0h1m1 0h4m2 0h1m1 0h1m4 0h2m1 0h1m5 0h1m-33 1h1m1 0h3m1 0h1m4 0h2m3 0h2m1 0h1m4 0h1m1 0h1m1 0h3m1 0h1m-33 1h1m1 0h3m1 0h1m1 0h1m1 0h3m1 0h1m1 0h1m2 0h2m1 0h1m1 0h1m1 0h1m1 0h3m1 0h1m-33 1h1m1 0h3m1 0h1m2 0h1m1 0h2m1 0h1m5 0h2m2 0h1m1 0h1m1 0h3m1 0h1m-33 1h1m5 0h1m6 0h2m2 0h5m4 0h1m5 0h1m-33 1h7m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h1m1 0h7m-25 1h1m1 0h1m1 0h1m1 0h1m2 0h2m1 0h1m-21 1h1m1 0h2m1 0h3m6 0h1m1 0h4m1 0h1m4 0h1m2 0h1m1 0h2m-32 1h5m2 0h5m3 0h1m1 0h4m1 0h1m2 0h2m1 0h2m1 0h1m-32 1h1m1 0h1m2 0h4m1 0h2m1 0h1m1 0h2m2 0h1m1 0h2m3 0h3m1 0h2m-32 1h4m2 0h1m1 0h2m2 0h2m3 0h3m2 0h2m2 0h1m1 0h1m1 0h2m-33 1h2m1 0h1m2 0h1m1 0h5m2 0h1m2 0h1m3 0h1m2 0h1m1 0h3m1 0h2m-32 1h1m1 0h3m1 0h1m3 0h1m1 0h1m2 0h1m1 0h1m3 0h1m1 0h1m2 0h1m3 0h1m-32 1h1m1 0h1m1 0h3m3 0h1m1 0h1m2 0h4m7 0h3m1 0h1m-31 1h1m1 0h4m1 0h2m1 0h1m1 0h3m1 0h1m1 0h10m1 0h2m-30 1h2m2 0h2m2 0h2m1 0h2m1 0h2m1 0h2m1 0h6m1 0h1m1 0h1m-28 1h1m1 0h1m4 0h1m3 0h2m1 0h1m2 0h1m2 0h4m1 0h2m1 0h2m-33 1h2m2 0h1m1 0h3m1 0h1m1 0h1m2 0h1m1 0h1m2 0h3m2 0h4m1 0h1m-31 1h1m1 0h2m1 0h1m4 0h1m2 0h2m1 0h1m5 0h3m3 0h1m2 0h1m-31 1h2m3 0h4m1 0h4m3 0h2m1 0h1m7 0h3m-32 1h4m1 0h1m4 0h1m2 0h3m2 0h1m2 0h1m1 0h1m1 0h2m3 0h1m1 0h1m-28 1h3m1 0h1m1 0h2m3 0h1m3 0h13m-32 1h3m1 0h1m1 0h1m2 0h1m1 0h3m1 0h1m1 0h2m2 0h1m1 0h1m3 0h1m-29 1h1m2 0h4m3 0h3m1 0h2m1 0h1m2 0h1m1 0h7m-21 1h3m1 0h6m1 0h1m3 0h2m3 0h2m1 0h1m-32 1h7m1 0h3m1 0h3m1 0h1m2 0h1m1 0h4m1 0h1m1 0h1m-29 1h1m5 0h1m1 0h3m3 0h1m1 0h1m3 0h5m3 0h4m-32 1h1m1 0h3m1 0h1m2 0h1m4 0h2m1 0h1m1 0h3m1 0h6m1 0h3m-33 1h1m1 0h3m1 0h1m1 0h5m4 0h3m1 0h2m4 0h1m1 0h2m1 0h1m-33 1h1m1 0h3m1 0h1m1 0h4m1 0h1m3 0h1m2 0h1m1 0h2m2 0h2m1 0h1m-30 1h1m5 0h1m6 0h7m2 0h7m3 0h1m-33 1h7m1 0h1m2 0h2m1 0h5m2 0h1m3 0h1m2 0h3\"/></svg>"
};


/* ---------- petites aides ---------- */
function elBureau(tag, classe, texte){
  const e = document.createElement(tag);
  if(classe) e.className = classe;
  if(texte != null) e.textContent = texte;
  return e;
}
function jourPlusBureau(iso, n){
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] + n)).toISOString().slice(0, 10) : '';
}
function rangJourBureau(iso){
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? (new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay() + 6) % 7 : 0;
}
function joursEntreBureau(a, b){
  const x = Date.parse(a + 'T12:00:00Z'), y = Date.parse(b + 'T12:00:00Z');
  return Math.round((y - x) / 86400000);
}
/* « Mer. 14 oct. » */
function jourCourtBureau(iso){
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) return String(iso || '');
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12));
  const j = d.toLocaleDateString('fr-FR', { timeZone: 'UTC', weekday: 'short' }).replace('.', '');
  const mo = d.toLocaleDateString('fr-FR', { timeZone: 'UTC', month: 'short' });
  return j.charAt(0).toUpperCase() + j.slice(1) + '. ' + (+m[3]) + ' ' + mo;
}
/* « jeudi 22 octobre » */
function jourLongBureau(iso){
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!m) return String(iso || '');
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12))
    .toLocaleDateString('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long' });
}
/* « Jeu. 22 octobre » */
function jourMoyenBureau(iso){
  const long = jourLongBureau(iso).split(' ');
  return jourCourtBureau(iso).split(' ')[0] + ' ' + long.slice(1).join(' ');
}
function heureBureauLisible(h){ return String(h || '').replace(/^0(\d)/, '$1').replace(':', 'h'); }
function minBureau(h){
  const m = String(h || '').match(/^(\d{2}):(\d{2})$/);
  return m ? (+m[1]) * 60 + (+m[2]) : -1;
}
function plagesLisibles(pl){
  return (pl || []).map(p => heureBureauLisible(p[0]) + ' – ' + heureBureauLisible(p[1])).join(' · ');
}
/* Deux créneaux qui se recouvrent n'en font qu'un — comme le Worker */
function fusionnerPlagesBureau(l){
  const brut = (l || []).map(p => [minBureau(p[0]), minBureau(p[1])])
    .filter(p => p[0] >= 0 && p[1] > p[0]).sort((a, b) => a[0] - b[0]);
  const out = [];
  brut.forEach(p => {
    const d = out[out.length - 1];
    if(d && p[0] <= d[1]) d[1] = Math.max(d[1], p[1]); else out.push([p[0], p[1]]);
  });
  const h = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  return out.map(p => [h(p[0]), h(p[1])]);
}
/* Le nom Drivup d'une colonne (« ChrystelAnQn ») devient celui de
   l'application (« Chrystel ») ; un nom qu'on ne reconnaît pas reste
   tel quel. Personne : c'est le bureau. */
function tenuDeDrivup(liste){
  const noms = [];
  (liste || []).forEach(t => {
    const n = (typeof moniteurDeLAppliDrivup === 'function' && moniteurDeLAppliDrivup(t)) || String(t || '').trim();
    if(n && noms.indexOf(n) === -1) noms.push(n);
  });
  return noms.join(', ');
}
function tenuLisible(t){ return String(t || '').trim() || 'le bureau'; }
function peutChangerBureau(){
  return !!(ACCES && ACCES.code) &&
         (ACCES.role === 'admin' || (typeof peutModifier === 'function' && peutModifier('bureaux')));
}

/* ------------------------------------------------------------
   L'ÉCRAN
   ------------------------------------------------------------ */
async function afficherUnBureau(id){
  const b = BUREAUX_APPLI[id];
  const zone = $('bureauZone-' + id);
  if(!b || !zone) return;
  if(!etatDesBureaux[id]) zone.innerHTML = '<div class="empty">Chargement…</div>';
  try{
    const e = await appelPrep({ action: 'bureauHoraires', bureau: id });
    etatDesBureaux[id] = e;
    dessinerBureau(id, e);
  }catch(err){
    zone.innerHTML = '';
    zone.appendChild(elBureau('div', 'empty', '⚠️ Lecture impossible : ' + ((err && err.message) || err)));
  }
}

function etatMaintenantBureau(e){
  const auj = (e.jours || []).find(j => j.jour === e.aujourdhui);
  let ouvert = false, jusqua = '', tenu = '';
  if(auj && auj.ouvert){
    auj.plages.forEach(p => {
      if(e.minutes >= minBureau(p[0]) && e.minutes < minBureau(p[1])){ ouvert = true; jusqua = p[1]; tenu = auj.tenu; }
    });
  }
  let prochaine = null;
  for(const j of (e.jours || [])){
    if(j.jour < e.aujourdhui || !j.ouvert) continue;
    const p = j.plages.find(x => j.jour > e.aujourdhui || minBureau(x[0]) > e.minutes);
    if(p){ prochaine = { jour: j.jour, heure: p[0], tenu: j.tenu }; break; }
  }
  return { ouvert, jusqua, tenu, prochaine };
}

function dessinerBureau(id, e){
  const b = BUREAUX_APPLI[id];
  const zone = $('bureauZone-' + id);
  if(!zone) return;
  zone.innerHTML = '';
  const reg = e.reglages || {};
  const modif = peutChangerBureau();
  const rien = !reg.drivup && !reg.page && !reg.rdv;

  if(rien){
    const v = elBureau('div', 'dvBandeau vide');
    v.append(elBureau('span', '', '💤'));
    v.firstChild.style.fontSize = '20px';
    const t = elBureau('span');
    t.append(elBureau('b', '', 'Rien n’est publié pour ' + b.nom),
             elBureau('small', '', 'Le favori ne lit pas ses créneaux dans Drivup, et son QR code mène à une page qui dit ' +
                                    'seulement qu’elle n’est pas active. Rallume un interrupteur pour retrouver les horaires ' +
                                    'et les rendez-vous ici.'));
    v.appendChild(t);
    zone.appendChild(v);
    zone.appendChild(elBureau('div', 'lvT', 'Les réglages de ce bureau'));
    zone.appendChild(reglagesDuBureauEcran(id, e, modif));
    return;
  }

  /* Ouvert ou fermé, maintenant */
  const m = etatMaintenantBureau(e);
  const rdvAVenir = (e.rdv || []).filter(r => !r.aTraiter);
  const et = elBureau('div', 'lvEtat');
  const pas = elBureau('span', 'p');
  if(m.ouvert) pas.style.background = '#2E9B2E';
  et.append(pas, elBureau('b', '', m.ouvert ? 'Ouvert en ce moment' : 'Fermé en ce moment'));
  const det = elBureau('span', 'lvEtatDet');
  if(m.ouvert) det.textContent = '· jusqu’à ' + heureBureauLisible(m.jusqua) + ', tenu par ' + tenuLisible(m.tenu);
  else if(m.prochaine){
    const demain = m.prochaine.jour === jourPlusBureau(e.aujourdhui, 1);
    det.textContent = '· prochaine ouverture ' + (m.prochaine.jour === e.aujourdhui ? 'aujourd’hui, '
                      : demain ? 'demain, ' : '') + jourLongBureau(m.prochaine.jour) + ' à ' +
                      heureBureauLisible(m.prochaine.heure) + ', tenu par ' + tenuLisible(m.prochaine.tenu);
  }else det.textContent = '· aucune ouverture connue';
  const nb = elBureau('span', 'lvEtatNb', '📅 ' + (e.rdv || []).length + ' rendez-vous à venir');
  et.append(det, nb);
  zone.appendChild(et);

  /* D'où viennent les horaires */
  zone.appendChild(bandeauDesHorairesBureau(e));

  /* ⚠️ À traiter */
  const aTraiter = (e.rdv || []).filter(r => r.aTraiter);
  if(aTraiter.length){
    zone.appendChild(elBureau('div', 'lvT', '⚠️ À traiter'));
    aTraiter.forEach(r => zone.appendChild(carteRdvBureau(id, r, true, modif)));
  }

  /* Les ouvertures */
  zone.appendChild(elBureau('div', 'lvT', 'Les ouvertures'));
  if(modif){
    const act = elBureau('div', 'lvAct');
    const auj = (e.jours || []).find(j => j.jour === e.aujourdhui);
    if(auj && auj.ouvert){
      const f = elBureau('button', 'btn btn-secondary', '🔒 Fermer aujourd’hui');
      f.addEventListener('click', () => fermerAujourdhuiBureau(id));
      act.appendChild(f);
    }
    const o = elBureau('button', 'btn btn-secondary', '➕ Ouvrir un autre jour');
    o.addEventListener('click', () => modifierUnJourBureau(id, ''));
    act.appendChild(o);
    zone.appendChild(act);
  }
  zone.appendChild(listeDesOuverturesBureau(id, e, modif));

  /* Les rendez-vous à venir */
  if(reg.rdv || rdvAVenir.length){
    zone.appendChild(elBureau('div', 'lvT', 'Les rendez-vous à venir'));
    if(!rdvAVenir.length) zone.appendChild(elBureau('div', 'empty', 'Aucun rendez-vous pour le moment.'));
    const MAX = 6;
    rdvAVenir.slice(0, MAX).forEach(r => zone.appendChild(carteRdvBureau(id, r, false, modif)));
    if(rdvAVenir.length > MAX){
      const pli = elBureau('details', 'dvPli');
      pli.appendChild(elBureau('summary', '', (rdvAVenir.length - MAX) + ' autre(s) rendez-vous'));
      rdvAVenir.slice(MAX).forEach(r => pli.appendChild(carteRdvBureau(id, r, false, modif)));
      zone.appendChild(pli);
    }
  }

  /* L'affiche de la vitrine */
  if(reg.page){
    zone.appendChild(elBureau('div', 'lvT', 'L’affiche de la vitrine'));
    const aff = elBureau('div', 'lvAff');
    const qr = elBureau('div', 'lvQr');
    qr.innerHTML = QR_BUREAUX[id] || '';
    const bt = elBureau('div', 'lvAffBt');
    const imp = elBureau('button', 'btn btn-primary', '🖨️ Imprimer l’affiche (A4)');
    imp.addEventListener('click', () => imprimerAfficheBureau(id));
    const cp = elBureau('button', 'btn btn-secondary', '🔗 Copier le lien de la page');
    cp.addEventListener('click', async () => {
      try{ await navigator.clipboard.writeText(b.page); showToast('🔗 Lien copié : ' + b.page); }
      catch(err){ showToast(b.page); }
    });
    bt.append(imp, cp);
    aff.append(qr, bt, elBureau('div', 'lvReg',
      'Le QR code mène toujours à la même page : on ne réimprime jamais l’affiche quand les horaires changent.'));
    zone.appendChild(aff);
  }

  zone.appendChild(elBureau('div', 'lvT', 'Les réglages de ce bureau'));
  zone.appendChild(reglagesDuBureauEcran(id, e, modif));
}

function bandeauDesHorairesBureau(e){
  const reg = e.reglages || {};
  const lect = e.lecture;
  const bd = elBureau('div', 'dvBandeau');
  const ic = elBureau('span');
  ic.style.fontSize = '20px';
  const t = elBureau('span');
  if(!reg.drivup){
    bd.classList.add('vide');
    ic.textContent = '✋';
    t.append(elBureau('b', '', 'Horaires réglés à la main'),
             elBureau('small', '', 'La reprise Drivup est coupée pour ce bureau : ouvre les jours avec « ➕ Ouvrir un autre jour ».'));
  }else if(!lect || !lect.au){
    bd.classList.add('vide');
    ic.textContent = '📥';
    t.append(elBureau('b', '', 'Les horaires n’ont pas encore été lus dans Drivup'),
             elBureau('small', '', 'Clique le favori « 📥 Bilan de conduite » sur le planning d’une agence dans Drivup : ' +
                                    'les créneaux « ' + ((e.bureau && e.bureau.drivup) || 'Bureau …') + ' » des quatre semaines à venir seront repris.'));
  }else{
    const reste = joursEntreBureau(e.aujourdhui, lect.au);
    const fin = jourLongBureau(lect.au);
    if(reste < 14){
      bd.classList.add('lvVieux');
      ic.textContent = '⏳';
      const f = elBureau('b', '', 'Plus que ' + Math.max(0, reste + 1) + ' jour' + (reste ? 's' : '') + ' d’horaires connus');
      t.append(f, document.createTextNode(' — jusqu’au ' + fin + ', lus le ' + lect.luLe + (lect.luPar ? ' par ' + lect.luPar : '')),
               elBureau('small', '', 'Après le ' + fin + ', la page ne propose plus de rendez-vous. ' +
                                      'Ouvre un planning d’agence dans Drivup et clique sur le favori.'));
    }else{
      ic.textContent = '📥';
      t.append(elBureau('b', '', 'Horaires lus dans Drivup le ' + lect.luLe),
               document.createTextNode((lect.luPar ? ' par ' + lect.luPar : '') + ' — connus jusqu’au ' + fin),
               elBureau('small', '', 'Drivup donne la base ; ce que tu changes ici à la main l’emporte, même si Drivup dit l’inverse.'));
    }
  }
  bd.append(ic, t);
  return bd;
}

/* Les jours ouverts (et ceux changés à la main), semaine par semaine.
   Les trois premières semaines dépliées, la suite dans un pli. */
function listeDesOuverturesBureau(id, e, modif){
  const out = elBureau('div');
  const jours = (e.jours || []).filter(j => j.jour >= e.aujourdhui && (j.ouvert || j.source === 'main'));
  if(!jours.length){
    out.appendChild(elBureau('div', 'empty', 'Aucune ouverture connue pour le moment.'));
    return out;
  }
  const lundiAuj = jourPlusBureau(e.aujourdhui, -rangJourBureau(e.aujourdhui));
  const semaines = {};
  jours.forEach(j => {
    const l = jourPlusBureau(j.jour, -rangJourBureau(j.jour));
    (semaines[l] = semaines[l] || []).push(j);
  });
  Object.keys(semaines).sort().forEach((l, i) => {
    const titre = l === lundiAuj ? 'Cette semaine' : 'Semaine du ' + jourLongBureau(l).replace(/^\S+\s/, '');
    let ou = out;
    if(i >= 3){
      const pli = elBureau('details', 'dvPli');
      const n = semaines[l].filter(j => j.ouvert).length;
      pli.appendChild(elBureau('summary', '', titre + ' : ' + n + ' jour' + (n > 1 ? 's' : '') + ' ouvert' + (n > 1 ? 's' : '')));
      out.appendChild(pli);
      ou = pli;
    }else ou.appendChild(elBureau('div', 'lvSemT', titre));
    semaines[l].forEach(j => ou.appendChild(ligneOuvertureBureau(id, e, j, modif)));
  });
  return out;
}

function ligneOuvertureBureau(id, e, j, modif){
  const reg = e.reglages || {};
  const main = j.source === 'main';
  const l = elBureau('div', 'lvO' + (main ? ' main' : '') + (!j.ouvert ? ' ferme' : ''));
  l.appendChild(elBureau('span', 'j', jourCourtBureau(j.jour)));
  const h = elBureau('span', 'h');
  if(j.ouvert) h.textContent = plagesLisibles(j.plages);
  else{
    if(j.base && j.base.ouvert){ const s = elBureau('s', '', plagesLisibles(j.base.plages)); h.append(s, document.createTextNode(' fermé')); }
    else h.textContent = 'fermé';
  }
  if(main){
    const dit = !reg.drivup ? '' : (j.base && j.base.connu)
      ? (j.base.ouvert ? 'Drivup : ' + plagesLisibles(j.base.plages) : 'Drivup : fermé')
      : 'Drivup : pas encore lu';
    const tag = elBureau('small', '', (j.ouvert ? '✋ ouvert à la main' : '✋ fermé à la main') + (dit ? ' · ' + dit : ''));
    h.appendChild(tag);
  }
  l.appendChild(h);
  l.appendChild(elBureau('span', 'q', j.ouvert ? '👤 ' + tenuLisible(j.tenu) : ''));
  const n = (e.rdv || []).filter(r => r.jour === j.jour).length;
  l.appendChild(elBureau('span', 'r', n ? '📅 ' + n + ' RDV' : ''));
  const a = elBureau('span', 'a');
  if(modif){
    const ed = elBureau('button', 'lvIc', '✏️');
    ed.title = 'Modifier ce jour';
    ed.addEventListener('click', () => modifierUnJourBureau(id, j.jour));
    a.appendChild(ed);
    if(main && reg.drivup){
      const re = elBureau('button', 'lvIc', '↩️');
      re.title = 'Revenir à Drivup';
      re.addEventListener('click', () => revenirADrivupBureau(id, j.jour));
      a.appendChild(re);
    }
  }
  l.appendChild(a);
  return l;
}

function carteRdvBureau(id, r, alerte, modif){
  const c = elBureau('div', 'lvRdv' + (alerte ? ' alerte' : ''));
  const l1 = elBureau('div', 'l1');
  l1.append(elBureau('b', '', jourMoyenBureau(r.jour) + ' · ' + heureBureauLisible(r.heure)),
            elBureau('span', 'm', r.motifLibelle || r.motif),
            elBureau('span', 'n', r.nom));
  c.appendChild(l1);
  const d = elBureau('div', 'd');
  const bouts = [];
  if(alerte) bouts.push('🔒 Le bureau n’est plus ouvert à cette heure-là');
  if(r.garde) bouts.push('👌 gardé hors des horaires');
  bouts.push(r.tel, r.mail);
  if(r.precision) bouts.push('« ' + r.precision + ' »');
  if(!alerte) bouts.push('tenu par ' + tenuLisible(r.tenu));
  bouts.push('pris le ' + r.creeLe);
  d.textContent = bouts.filter(Boolean).join(' · ');
  c.appendChild(d);
  const row = elBureau('div', 'btn-row');
  const ap = elBureau('a', 'btn btn-secondary', '📞 Appeler');
  ap.href = 'tel:' + String(r.tel || '').replace(/[^\d+]/g, '');
  row.appendChild(ap);
  if(!alerte){
    const ec = elBureau('a', 'btn btn-secondary', '✉️ Écrire');
    ec.href = 'mailto:' + encodeURIComponent(r.mail || '');
    row.appendChild(ec);
  }
  if(modif){
    const an = elBureau('button', 'btn btn-secondary', alerte ? '✖️ Annuler et prévenir par mail' : '✖️ Annuler (prévenu par mail)');
    an.addEventListener('click', async () => {
      if(!await confirmer('Annuler le rendez-vous de ' + r.nom + ', ' + jourLongBureau(r.jour) + ' à ' +
                          heureBureauLisible(r.heure) + ' ?\n\nUn mail le prévient et lui propose d’en reprendre un.',
                          'Annuler le rendez-vous', true)) return;
      an.disabled = true;
      try{
        await appelPrep({ action: 'bureauRdvAnnuler', id: r.id, prevenir: true });
        showToast('✖️ Rendez-vous annulé — ' + r.nom + ' est prévenu par mail.');
        afficherUnBureau(id);
      }catch(err){ an.disabled = false; showToast('Impossible : ' + err.message); }
    });
    row.appendChild(an);
    if(alerte){
      const ga = elBureau('button', 'btn btn-secondary', '👌 Je m’en occupe');
      ga.addEventListener('click', async () => {
        ga.disabled = true;
        try{
          await appelPrep({ action: 'bureauRdvGarder', id: r.id });
          afficherUnBureau(id);
        }catch(err){ ga.disabled = false; showToast('Impossible : ' + err.message); }
      });
      row.appendChild(ga);
    }
  }
  c.appendChild(row);
  return c;
}

/* ------------------------------------------------------------
   LES TROIS INTERRUPTEURS — le même composant que les réglages des
   procédures et de l'affichage (interrupteur, ec-proccorriger.js)
   ------------------------------------------------------------ */
function reglagesDuBureauEcran(id, e, modif){
  const b = BUREAUX_APPLI[id];
  const reg = e.reglages || {};
  const z = elBureau('div', 'lvReglages');
  if(typeof interrupteur !== 'function'){
    z.appendChild(elBureau('div', 'empty', 'Réglages indisponibles : le module des procédures n’est pas chargé.'));
    return z;
  }
  const page = b.page.replace(/^https:\/\//, '').replace(/\/$/, '');
  const basculer = cle => async (vers) => {
    if(!modif) throw new Error('Il faut le droit « Horaires et rendez-vous des bureaux » en modification.');
    await changerUnReglageBureau(id, cle, vers ? 1 : 0);
  };
  z.appendChild(interrupteur({
    cle: 'bureauDrivup', titre: '📥 Horaires repris de Drivup', ouvert: !!reg.drivup,
    quandOuvert: 'Le favori lit les créneaux « ' + ((e.bureau && e.bureau.drivup) || 'Bureau ' + b.nom) +
                 ' » des quatre semaines à venir. Ce que tu changes à la main l’emporte.',
    quandFerme: 'Le favori ne lit pas ce bureau dans Drivup. Les horaires se règlent ici, à la main.',
    basculer: basculer('drivup'), apres: () => afficherUnBureau(id)
  }));
  z.appendChild(interrupteur({
    cle: 'bureauPage', titre: '🌐 Page publique et QR code', ouvert: !!reg.page,
    quandOuvert: page + ' est en ligne : ouvert ou fermé maintenant, les horaires, l’adresse et le téléphone.',
    quandFerme: 'QR code coupé : ' + page + ' dit seulement que la page n’est pas active, avec l’adresse et le téléphone.',
    basculer: basculer('page'), apres: () => afficherUnBureau(id)
  }));
  z.appendChild(interrupteur({
    cle: 'bureauRdv', titre: '📅 Prise de rendez-vous en ligne', ouvert: !!reg.rdv,
    quandOuvert: 'Le bouton « Prendre rendez-vous au bureau » est sur la page : 30 minutes, un par créneau, ' +
                 'pendant les heures d’ouverture.',
    quandFerme: reg.page ? 'La page montre seulement les horaires d’ouverture et de fermeture, sans bouton de rendez-vous.'
                         : 'Sans effet tant que la page publique est coupée.',
    basculer: basculer('rdv'), apres: () => afficherUnBureau(id)
  }));
  return z;
}

async function changerUnReglageBureau(id, cle, valeur){
  let decisions = {};
  /* Couper la page ou les rendez-vous : ceux déjà pris, un par un */
  if(!valeur && (cle === 'page' || cle === 'rdv')){
    const reg = {}; reg[cle] = 0;
    const imp = await appelPrep({ action: 'bureauImpact', bureau: id, hypo: { reglages: reg } });
    if(imp.touches && imp.touches.length){
      decisions = await deciderPourLesRdvBureau(imp.touches,
        cle === 'page' ? '🌐 Couper la page publique ?' : '📅 Couper la prise de rendez-vous ?',
        'Les nouveaux rendez-vous seront bloqués. Pour ceux déjà pris :',
        cle === 'page' ? '🌐 Couper la page' : '📅 Couper les rendez-vous');
      if(decisions === null) throw new Error('rien n’a changé');
    }
  }
  await appelPrep({ action: 'bureauReglage', bureau: id, cle: cle, valeur: valeur, decisions: decisions });
}

/* ------------------------------------------------------------
   « QUE FAIRE DE CES RENDEZ-VOUS ? » — un par un
   Rend { id: 'annuler' | 'garder' } (ce qui n'est pas choisi passe
   « à traiter »), ou null si on renonce.
   ------------------------------------------------------------ */
function fenetreBureau(titre){
  const fond = elBureau('div', 'overlay show');
  const boite = elBureau('div', 'modal lvModale');
  boite.appendChild(elBureau('h3', '', titre));
  fond.appendChild(boite);
  document.body.appendChild(fond);
  return { fond, boite, fermer: () => { if(fond.parentNode) fond.remove(); } };
}

function choixDesRdvBureau(touches, ou, dans){
  const choix = dans || {};
  touches.forEach(r => {
    const f = elBureau('div', 'lvFr');
    f.append(elBureau('b', '', jourCourtBureau(r.jour) + ' · ' + heureBureauLisible(r.heure) + ' · ' + r.nom),
             document.createTextNode(' '), elBureau('span', '', r.motifLibelle || r.motif));
    const chx = elBureau('div', 'lvChx');
    [['annuler', '✖️ Annuler et prévenir par mail'], ['garder', '👌 Je m’en occupe']].forEach(([v, t]) => {
      const lab = elBureau('label');
      const inp = document.createElement('input');
      inp.type = 'radio';
      inp.name = 'rdv-' + r.id;
      inp.value = v;
      inp.addEventListener('change', () => { if(inp.checked) choix[r.id] = v; });
      lab.append(inp, document.createTextNode(' ' + t));
      chx.appendChild(lab);
    });
    f.appendChild(chx);
    ou.appendChild(f);
  });
  return choix;
}

function deciderPourLesRdvBureau(touches, titre, intro, libelle){
  return new Promise(resolve => {
    const f = fenetreBureau(titre);
    f.boite.appendChild(elBureau('div', 'lvMs', intro));
    f.boite.appendChild(elBureau('div', 'lvT', touches.length + ' rendez-vous ' + (touches.length > 1 ? 'sont pris' : 'est pris')));
    const choix = choixDesRdvBureau(touches, f.boite);
    f.boite.appendChild(elBureau('div', 'lvMs', 'Sans choix, le rendez-vous reste et passe « ⚠️ À traiter ».'));
    const row = elBureau('div', 'btn-row');
    const ok = elBureau('button', 'btn btn-primary', libelle);
    ok.style.flex = '2';
    const non = elBureau('button', 'btn btn-secondary', 'Annuler');
    non.style.flex = '1';
    ok.addEventListener('click', () => { f.fermer(); resolve(choix); });
    non.addEventListener('click', () => { f.fermer(); resolve(null); });
    row.append(ok, non);
    f.boite.appendChild(row);
  });
}

/* ------------------------------------------------------------
   ✏️ UN JOUR — et ➕ OUVRIR UN AUTRE JOUR (jour vide)
   ------------------------------------------------------------ */
function selectHeureBureau(v){
  const s = document.createElement('select');
  for(let m = 7 * 60; m <= 21 * 60; m += 30){
    const h = String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
    const o = document.createElement('option');
    o.value = h;
    o.textContent = heureBureauLisible(h);
    if(h === v) o.selected = true;
    s.appendChild(o);
  }
  return s;
}

function equipeDuBureau(){
  const l = [];
  ((typeof moniteursActifs !== 'undefined' && moniteursActifs) || []).forEach(n => { if(n && l.indexOf(n) === -1) l.push(n); });
  if(ACCES && ACCES.moniteur && l.indexOf(ACCES.moniteur) === -1) l.push(ACCES.moniteur);
  return l.sort((a, b) => a.localeCompare(b, 'fr'));
}

async function modifierUnJourBureau(id, jour){
  const e = etatDesBureaux[id];
  if(!e) return;
  if(typeof chargerMoniteurs === 'function' && !((typeof moniteursActifs !== 'undefined') && moniteursActifs.length)){
    try{ await chargerMoniteurs(); }catch(err){}
  }
  const j = (e.jours || []).find(x => x.jour === jour) || null;
  const f = fenetreBureau(jour ? '✏️ ' + jourLongBureau(jour).replace(/^./, c => c.toUpperCase()) : '➕ Ouvrir un autre jour');

  let date = null;
  if(!jour){
    f.boite.appendChild(elBureau('label', '', 'Le jour'));
    date = document.createElement('input');
    date.type = 'date';
    date.min = e.aujourdhui;
    date.max = jourPlusBureau(e.aujourdhui, 120);
    f.boite.appendChild(date);
  }
  const dit = elBureau('div', 'lvMs');
  const direDrivup = x => {
    dit.textContent = '';
    if(!(e.reglages || {}).drivup){ dit.textContent = 'La reprise Drivup est coupée pour ce bureau.'; return; }
    if(!x || !x.base || !x.base.connu){ dit.textContent = 'Drivup : pas encore lu pour ce jour.'; return; }
    dit.append(document.createTextNode('Drivup : '),
               elBureau('b', '', x.base.ouvert ? plagesLisibles(x.base.plages) : 'fermé'),
               document.createTextNode(x.base.ouvert ? ', tenu par ' + tenuLisible(x.base.tenu)
                                                     : ' (aucun créneau « ' + ((e.bureau && e.bureau.drivup) || 'Bureau') + ' »)'));
  };
  direDrivup(j);
  f.boite.appendChild(dit);

  const chx = elBureau('div', 'lvChx');
  const radios = {};
  [['1', '🔓 Ouvert'], ['0', '🔒 Fermé']].forEach(([v, t]) => {
    const lab = elBureau('label');
    const inp = document.createElement('input');
    inp.type = 'radio';
    inp.name = 'ouvertBureau';
    inp.value = v;
    radios[v] = inp;
    lab.append(inp, document.createTextNode(' ' + t));
    chx.appendChild(lab);
  });
  f.boite.appendChild(chx);

  const zH = elBureau('div', 'lvHoraires');
  zH.appendChild(elBureau('label', '', 'Horaires'));
  const lignes = elBureau('div');
  zH.appendChild(lignes);
  const ajouterPlage = (a, b) => {
    const l = elBureau('div', 'lvPl');
    const s1 = selectHeureBureau(a), s2 = selectHeureBureau(b);
    const x = elBureau('button', 'lvPetit', '✕');
    x.title = 'Retirer cette plage';
    x.addEventListener('click', () => { if(lignes.children.length > 1) l.remove(); });
    l.append(s1, document.createTextNode(' à '), s2, x);
    lignes.appendChild(l);
  };
  const plus = elBureau('button', 'lvPetit', '+ une plage');
  plus.addEventListener('click', () => { if(lignes.children.length < 3) ajouterPlage('14:00', '17:00'); });
  zH.appendChild(plus);
  zH.appendChild(elBureau('label', '', 'Tenu par'));
  const tenu = document.createElement('select');
  const oB = document.createElement('option');
  oB.value = ''; oB.textContent = 'le bureau';
  tenu.appendChild(oB);
  equipeDuBureau().forEach(n => { const o = document.createElement('option'); o.value = n; o.textContent = n; tenu.appendChild(o); });
  zH.appendChild(tenu);
  f.boite.appendChild(zH);

  const poser = x => {
    const ouvert = x ? x.ouvert : true;
    radios[ouvert ? '1' : '0'].checked = true;
    lignes.innerHTML = '';
    const pl = x && x.ouvert ? x.plages : (x && x.base && x.base.ouvert ? x.base.plages : [['09:00', '12:00']]);
    pl.forEach(p => ajouterPlage(p[0], p[1]));
    const t = String((x && (x.tenu || (x.base && x.base.tenu))) || '').split(',')[0].trim();
    if(t && !Array.from(tenu.options).some(o => o.value === t)){
      const o = document.createElement('option'); o.value = t; o.textContent = t; tenu.appendChild(o);
    }
    tenu.value = t;
    zH.style.display = ouvert ? '' : 'none';
  };
  poser(j);
  radios['1'].addEventListener('change', () => { zH.style.display = ''; });
  radios['0'].addEventListener('change', () => { zH.style.display = 'none'; });
  if(date){
    date.addEventListener('change', () => {
      const x = (e.jours || []).find(y => y.jour === date.value) || null;
      direDrivup(x);
      poser(x && x.ouvert ? x : { ouvert: true, plages: [['09:00', '12:00']], tenu: '', base: x && x.base });
    });
  }

  f.boite.appendChild(elBureau('div', 'lvMs', '✋ Ce jour reste comme tu le règles ici, même si une prochaine lecture de Drivup dit autre chose.'));
  const etat = elBureau('div', 'dvNote');
  const row = elBureau('div', 'btn-row');
  const ok = elBureau('button', 'btn btn-primary', '✅ Enregistrer');
  ok.style.flex = '2';
  const non = elBureau('button', 'btn btn-secondary', 'Annuler');
  non.style.flex = '1';
  non.addEventListener('click', f.fermer);
  row.append(ok, non);
  if(j && j.source === 'main' && (e.reglages || {}).drivup){
    const re = elBureau('button', 'btn btn-secondary', '↩️ Revenir à Drivup');
    re.addEventListener('click', () => { f.fermer(); revenirADrivupBureau(id, jour); });
    row.appendChild(re);
  }
  f.boite.append(row, etat);

  ok.addEventListener('click', async () => {
    const leJour = jour || (date && date.value) || '';
    if(!/^\d{4}-\d{2}-\d{2}$/.test(leJour)){ etat.textContent = '⚠️ Choisis le jour.'; return; }
    const ouvert = radios['1'].checked;
    const plages = Array.from(lignes.querySelectorAll('.lvPl')).map(l => {
      const s = l.querySelectorAll('select');
      return [s[0].value, s[1].value];
    });
    if(ouvert && plages.some(p => minBureau(p[1]) <= minBureau(p[0]))){
      etat.textContent = '⚠️ Une plage finit avant de commencer.';
      return;
    }
    const regle = { ouvert: ouvert ? 1 : 0, plages: ouvert ? fusionnerPlagesBureau(plages) : [], tenu: ouvert ? tenu.value : '' };
    ok.disabled = true;
    try{
      const hypo = { main: {} };
      hypo.main[leJour] = regle;
      const imp = await appelPrep({ action: 'bureauImpact', bureau: id, hypo: hypo });
      let decisions = {};
      if(imp.touches && imp.touches.length){
        f.fond.style.display = 'none';
        decisions = await deciderPourLesRdvBureau(imp.touches, '📅 Des rendez-vous tombent hors des horaires',
          jourLongBureau(leJour).replace(/^./, c => c.toUpperCase()) + ' : ' +
          (ouvert ? plagesLisibles(regle.plages) : 'fermé') + '.', '✅ Enregistrer');
        if(decisions === null){ f.fond.style.display = ''; ok.disabled = false; return; }
      }
      await appelPrep(Object.assign({ action: 'bureauJour', bureau: id, jour: leJour, decisions: decisions }, regle));
      f.fermer();
      showToast(ouvert ? '🔓 ' + jourCourtBureau(leJour) + ' ouvert : ' + plagesLisibles(regle.plages)
                       : '🔒 ' + jourCourtBureau(leJour) + ' fermé');
      afficherUnBureau(id);
    }catch(err){
      f.fond.style.display = '';
      ok.disabled = false;
      etat.textContent = '⚠️ ' + ((err && err.message) || err);
    }
  });
}

async function revenirADrivupBureau(id, jour){
  try{
    const hypo = { main: {} };
    hypo.main[jour] = null;
    const imp = await appelPrep({ action: 'bureauImpact', bureau: id, hypo: hypo });
    let decisions = {};
    if(imp.touches && imp.touches.length){
      decisions = await deciderPourLesRdvBureau(imp.touches, '↩️ Revenir à Drivup ?',
        'Avec les horaires de Drivup, ces rendez-vous tombent hors des heures d’ouverture.', '↩️ Revenir à Drivup');
      if(decisions === null) return;
    }else if(!await confirmer(jourLongBureau(jour).replace(/^./, c => c.toUpperCase()) +
                              ' reprendra les horaires de Drivup.', '↩️ Revenir à Drivup')) return;
    await appelPrep({ action: 'bureauJour', bureau: id, jour: jour, retour: true, decisions: decisions });
    showToast('↩️ ' + jourCourtBureau(jour) + ' : horaires de Drivup');
    afficherUnBureau(id);
  }catch(err){ showToast('Impossible : ' + err.message); }
}

/* 🔒 Fermer aujourd'hui — les rendez-vous du jour, un par un */
async function fermerAujourdhuiBureau(id){
  const e = etatDesBureaux[id];
  if(!e) return;
  const auj = e.aujourdhui;
  const j = (e.jours || []).find(x => x.jour === auj);
  let touches = [];
  try{
    const hypo = { main: {} };
    hypo.main[auj] = { ouvert: 0, plages: [], tenu: '' };
    const imp = await appelPrep({ action: 'bureauImpact', bureau: id, hypo: hypo });
    touches = imp.touches || [];
  }catch(err){ showToast('Impossible : ' + err.message); return; }

  const f = fenetreBureau('🔒 Fermer aujourd’hui ?');
  f.boite.appendChild(elBureau('div', 'lvMs',
    jourLongBureau(auj).replace(/^./, c => c.toUpperCase()) +
    (j && j.ouvert ? ' — ' + (j.source === 'main' ? 'ouvert à la main : ' : 'Drivup : ') + plagesLisibles(j.plages) +
                     ', tenu par ' + tenuLisible(j.tenu) + '.' : '.') +
    ' La page affichera « fermé exceptionnellement » et ne proposera plus ce jour.'));
  let choix = {};
  if(touches.length){
    f.boite.appendChild(elBureau('div', 'lvT', touches.length + ' rendez-vous ' + (touches.length > 1 ? 'sont pris' : 'est pris')));
    choix = choixDesRdvBureau(touches, f.boite);
  }
  const etat = elBureau('div', 'dvNote');
  const row = elBureau('div', 'btn-row');
  const ok = elBureau('button', 'btn btn-secondary', '🔒 Fermer aujourd’hui');
  ok.style.cssText = 'flex:2;color:var(--red);border-color:var(--red);';
  const non = elBureau('button', 'btn btn-secondary', 'Annuler');
  non.style.flex = '1';
  non.addEventListener('click', f.fermer);
  row.append(ok, non);
  f.boite.append(row, etat);
  ok.addEventListener('click', async () => {
    ok.disabled = true;
    try{
      await appelPrep({ action: 'bureauJour', bureau: id, jour: auj, ouvert: 0, plages: [], tenu: '', decisions: choix });
      f.fermer();
      showToast('🔒 Bureau de ' + BUREAUX_APPLI[id].nom + ' fermé aujourd’hui');
      afficherUnBureau(id);
    }catch(err){ ok.disabled = false; etat.textContent = '⚠️ ' + ((err && err.message) || err); }
  });
}

/* ------------------------------------------------------------
   🖨️ L'AFFICHE — le QR code et la phrase, rien d'autre (David :
   « mets-moi juste le QR code avec la phrase pour connaître nos
   heures d'ouverture »)
   ------------------------------------------------------------ */
function imprimerAfficheBureau(id){
  const w = window.open('', '_blank');
  if(!w){ showToast('⚠️ Autorise les fenêtres pour imprimer l’affiche.'); return; }
  const qr = String(QR_BUREAUX[id] || '').replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  w.document.open();
  w.document.write('<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Affiche — ' +
    BUREAUX_APPLI[id].titre + '</title><style>' +
    '@page{size:A4;margin:0}html,body{margin:0;background:#fff;color:#0B0B0B;' +
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;}' +
    '.a4{width:210mm;height:296mm;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;}' +
    '.qr{width:118mm;height:118mm;border:3.2mm solid #0B0B0B;border-radius:8mm;padding:3.2mm;box-sizing:border-box;}' +
    '.qr svg{width:100%;height:100%;display:block}' +
    '.appel{font-size:11.6mm;font-weight:900;line-height:1.15;margin:11.6mm 16mm 0;max-width:170mm;}' +
    '</style></head><body><div class="a4"><div class="qr">' + qr + '</div>' +
    '<div class="appel">📱 Scannez pour connaître nos heures d’ouverture</div></div>' +
    '<script>setTimeout(function(){window.print();},300);<\/script></body></html>');
  w.document.close();
}

/* ------------------------------------------------------------
   OUVRIR L'ÉCRAN DEPUIS UNE NOTIFICATION — « ?vue=loudeac »
   ------------------------------------------------------------ */
function allerAuBureau(vue){
  if(!BUREAU_DE_LA_VUE[vue]) return;
  const essayer = n => {
    if(!(ACCES && ACCES.code)){ if(n < 120) setTimeout(() => essayer(n + 1), 500); return; }
    try{
      afficherOnglet('gestion');
      afficherVue('gestion', vue);
    }catch(err){}
  };
  essayer(0);
}
(function(){
  try{
    const u = new URL(location.href);
    const v = u.searchParams.get('vue');
    if(v && BUREAU_DE_LA_VUE[v]){
      u.searchParams.delete('vue');
      history.replaceState(null, '', u.pathname + u.search + u.hash);
      allerAuBureau(v);
    }
  }catch(err){}
  if(navigator.serviceWorker){
    navigator.serviceWorker.addEventListener('message', ev => {
      const d = ev && ev.data;
      if(d && d.quoi === 'ouvrirVue') allerAuBureau(d.vue);
    });
  }
})();

/* ------------------------------------------------------------
   📥 DANS LA FENÊTRE DU FAVORI — les horaires lus dans Drivup

   Le favori a lu, en plus des cours, les créneaux « Bureau … » des
   quatre semaines à venir pour les bureaux dont la reprise est
   activée. On montre CE QUI CHANGE : jours ouverts, horaires changés,
   jours fermés — et, pour un jour qui ferme avec des rendez-vous, le
   choix un par un. Un jour réglé à la main est « ✋ gardé » : on dit
   seulement ce que Drivup en pense.
   ------------------------------------------------------------ */
function ligneBureauDrivup(jour, fort, detail, etat, libelle){
  const l = elBureau('div', 'dvL ' + etat);
  const h = elBureau('span', 'dvH');
  const court = jourCourtBureau(jour).split(' ');
  h.append(document.createTextNode(court[0].toLowerCase() + ' ' + court[1]), document.createElement('br'));
  const mo = elBureau('span', '', court.slice(2).join(' '));
  mo.style.cssText = 'font-weight:400;color:var(--muted);font-size:11.5px;';
  h.appendChild(mo);
  const q = elBureau('span', 'dvQui');
  const b = elBureau(etat === 'annule' ? 's' : 'b', '', fort);
  if(etat === 'annule'){ b.style.cssText = 'display:block;font-size:14.5px;font-weight:700;'; }
  q.append(b, elBureau('span', '', detail));
  l.append(h, q, elBureau('span', 'dvEt ' + etat, libelle));
  return l;
}

async function blocDesBureauxDrivup(p, boite, avant){
  const lus = [];
  const ou = elBureau('div', 'dvLou');
  const poser = x => { if(avant && avant.parentNode === boite) boite.insertBefore(x, avant); else boite.appendChild(x); };
  if(p.bureauxErreur){
    const w = elBureau('div', 'dvNote', '⚠️ ' + p.bureauxErreur);
    w.style.color = 'var(--warn-text)';
    ou.appendChild(w);
  }
  for(const lu of (Array.isArray(p.bureaux) ? p.bureaux : [])){
    const b = BUREAUX_APPLI[lu && lu.bureau];
    if(!b || !/^\d{4}-\d{2}-\d{2}$/.test(String(lu.du)) || !/^\d{4}-\d{2}-\d{2}$/.test(String(lu.au))) continue;
    let e;
    try{ e = await appelPrep({ action: 'bureauHoraires', bureau: b.id }); }
    catch(err){ ou.appendChild(elBureau('div', 'dvNote', '⚠️ ' + b.titre + ' : ' + ((err && err.message) || err))); continue; }
    if(!(e.reglages || {}).drivup) continue;

    const jours = (lu.jours || []).filter(j => j && /^\d{4}-\d{2}-\d{2}$/.test(String(j.jour)) && j.jour >= lu.du && j.jour <= lu.au)
      .map(j => ({ jour: j.jour, plages: fusionnerPlagesBureau(j.plages), tenu: tenuDeDrivup(j.tenu) }))
      .filter(j => j.plages.length);
    const neuf = {};
    jours.forEach(j => { neuf[j.jour] = j; });
    const avantJ = {};
    (e.jours || []).forEach(j => { avantJ[j.jour] = j; });

    let touches = [];
    try{
      const imp = await appelPrep({ action: 'bureauImpact', bureau: b.id, hypo: { drivup: { du: lu.du, au: lu.au, jours: jours } } });
      touches = imp.touches || [];
    }catch(err){ touches = []; }
    const touchesDuJour = {};
    touches.forEach(r => { (touchesDuJour[r.jour] = touchesDuJour[r.jour] || []).push(r); });

    const n = { ouverts: 0, neufs: 0, changes: 0, fermes: 0, gardes: 0, pareils: 0 };
    const lignes = [];
    for(let d = lu.du; d && d <= lu.au; d = jourPlusBureau(d, 1)){
      const a = avantJ[d];
      const x = neuf[d];
      const ancien = a && a.base && a.base.connu ? a.base : null;
      if(a && a.source === 'main'){
        if(a.ouvert) n.ouverts++;
        const pareil = a.ouvert ? (x && plagesLisibles(x.plages) === plagesLisibles(a.plages)) : !x;
        if(pareil){ n.pareils++; continue; }
        n.gardes++;
        lignes.push({ jour: d, el: ligneBureauDrivup(d, a.ouvert ? plagesLisibles(a.plages) : 'fermé',
          (a.ouvert ? '👤 ' + tenuLisible(a.tenu) + ' — ouvert à la main ; ' : 'fermé à la main ; ') +
          'Drivup dit ' + (x ? plagesLisibles(x.plages) + (x.tenu ? ' avec ' + x.tenu : '') : 'fermé'), 'main', '✋ Gardé') });
        continue;
      }
      if(x) n.ouverts++;
      if(!ancien || !ancien.ouvert){
        if(!x){ continue; }
        n.neufs++;
        lignes.push({ jour: d, el: ligneBureauDrivup(d, plagesLisibles(x.plages), '👤 ' + tenuLisible(x.tenu), 'neuf', '🆕 Ouvert') });
        continue;
      }
      if(!x){
        n.fermes++;
        lignes.push({ jour: d, el: ligneBureauDrivup(d, plagesLisibles(ancien.plages),
          '👤 ' + tenuLisible(ancien.tenu) + ' — plus de créneau dans Drivup', 'annule', '🔒 Fermé') });
        continue;
      }
      if(plagesLisibles(x.plages) !== plagesLisibles(ancien.plages) || (x.tenu || '') !== (ancien.tenu || '')){
        n.changes++;
        lignes.push({ jour: d, el: ligneBureauDrivup(d, plagesLisibles(x.plages),
          '👤 ' + tenuLisible(x.tenu) + ' — était ' + plagesLisibles(ancien.plages) +
          ((ancien.tenu || '') !== (x.tenu || '') ? ' avec ' + tenuLisible(ancien.tenu) : ''), 'bouge', '🕐 Changé') });
        continue;
      }
      n.pareils++;
    }

    const bloc = elBureau('div');
    bloc.appendChild(elBureau('h4', '', '📍 ' + b.titre + ' — les ouvertures'));
    bloc.appendChild(elBureau('div', 'dvSous', 'Les créneaux « ' + ((e.bureau && e.bureau.drivup) || 'Bureau ' + b.nom) +
      ' » de Drivup, lus du ' + jourLongBureau(lu.du) + ' au ' + jourLongBureau(lu.au) + ', quel que soit le jour affiché.'));
    const puces = elBureau('div', 'dvPuces');
    puces.append(puceDrivup('', n.ouverts, n.ouverts > 1 ? '📅 jours ouverts' : '📅 jour ouvert'));
    if(n.neufs) puces.append(puceDrivup('neuf', n.neufs, n.neufs > 1 ? '🆕 nouveaux' : '🆕 nouveau'));
    if(n.changes) puces.append(puceDrivup('bouge', n.changes, n.changes > 1 ? '🕐 changés' : '🕐 changé'));
    if(n.fermes) puces.append(puceDrivup('annule', n.fermes, n.fermes > 1 ? '🔒 fermés' : '🔒 fermé'));
    if(n.gardes) puces.append(puceDrivup('bouge', n.gardes, n.gardes > 1 ? '✋ gardés à la main' : '✋ gardé à la main'));
    bloc.appendChild(puces);

    const choix = {};
    const vusRdv = {};
    lignes.forEach(l => {
      bloc.appendChild(l.el);
      const t = touchesDuJour[l.jour];
      if(t && t.length){
        const z = elBureau('div', 'dvChoix');
        choixDesRdvBureau(t, z, choix);
        t.forEach(r => { vusRdv[r.id] = true; });
        bloc.appendChild(z);
      }
    });
    /* Un rendez-vous touché sur un jour sans ligne (rare : un jour
       identique mais un rendez-vous déjà hors des horaires) */
    const reste = touches.filter(r => !vusRdv[r.id]);
    if(reste.length){
      const z = elBureau('div', 'dvChoix');
      z.appendChild(elBureau('div', 'lvMs', 'Hors des horaires de Drivup :'));
      choixDesRdvBureau(reste, z, choix);
      bloc.appendChild(z);
    }
    if(!lignes.length) bloc.appendChild(elBureau('div', 'dvPli', '✅ Rien de neuf : ' + n.pareils + ' jours déjà à jour.'));
    else if(n.pareils) bloc.appendChild(elBureau('div', 'dvPli', '▸ ' + n.pareils + ' jour' + (n.pareils > 1 ? 's' : '') +
                                                ' identique' + (n.pareils > 1 ? 's' : '') + ' (rien à faire)'));
    ou.appendChild(bloc);
    lus.push({ bureau: b.id, nom: b.nom, du: lu.du, au: lu.au, jours: jours, choix: choix });
  }
  if(ou.children.length) poser(ou);
  return lus;
}

async function poserLesBureauxDrivup(lus){
  const faits = [];
  for(const x of (lus || [])){
    await appelPrep({ action: 'bureauDrivupPoser', bureau: x.bureau, du: x.du, au: x.au, jours: x.jours, decisions: x.choix });
    faits.push(x.nom);
    delete etatDesBureaux[x.bureau];
  }
  return faits;
}

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-bureaux.js'] = true;
