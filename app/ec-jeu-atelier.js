/* Déployé le 26/10/2026 à 14:46 — v1271 */
/* ============================================================
   ec-jeu-atelier.js — 📸 L'ATELIER DU JEU DES VÉRIFICATIONS (v1249)

   Outils › Ce qu'on écrit › 🧰 Vérifications › « 📸 Nos voitures ».
   Administrateurs seuls (le Worker le vérifie dans chaque porte).

   Ce que David a demandé, et où c'est :
     · « des photos des moteurs, des intérieurs, des voyants » — une
       photo par ENDROIT (au volant, porte ouverte, devant, capot
       ouvert, voyants allumés, coffre, arrière, côté, roue) ;
     · « des intérieurs et des moteurs identiques pour plusieurs
       voitures : il faut que je puisse dire cette photo concerne telle
       et telle voiture » — « Cette photo sert à : » sous la photo. Une
       voiture n'a qu'une photo par endroit : la cocher sur une photo
       la décoche de l'autre ;
     · des ZONES dessinées au doigt sur la photo : 🎯 la réponse à des
       questions, ou ➡️ un passage (la porte, la manette, le capot) ;
     · « pour ouvrir le capot chez nous, il faut d'abord ouvrir la
       porte pour accéder à la poignée qui ouvre le capot : je dois
       pouvoir choisir l'ordre par voiture, et l'appliquer à plusieurs
       voitures en un clic » — 🧭 LE CHEMIN vers un endroit : les
       passages à toucher, dans l'ordre (↑ ↓), et « Appliquer aussi
       à : » ;
     · « montrer la hauteur des feux : chez nous il n'y a pas de
       commande, l'élève doit dire que c'est automatique » et
       « certains voyants n'existent pas : c'est l'ordinateur de bord »
       — 🔧 LES RÈGLES par question et par voiture (🗣️ / 🖥️), elles
       aussi « Même chose pour : ».
   ============================================================ */
/* 🧤 v1271 — trois endroits de plus. David, le 26 octobre : « pour
   l'airbag passager, il faut que j'ajoute la photo côté passager et
   ouvrir la boîte à gants ; les fixations Isofix, c'est sur les sièges
   arrière ; la sécurité enfant, il faut que je prenne en photo la
   portière arrière ouverte ». */
const AT_ENDROITS = [['volant', '🪑 Au volant'], ['porte', '🚪 Porte ouverte'], ['passager', '🧤 Côté passager, boîte à gants ouverte'],
  ['portiere', '🚪 Portière arrière ouverte'], ['sieges', '💺 Sièges arrière'], ['devant', '🚶 Devant'], ['capot', '🔧 Capot ouvert'],
  ['voyants', '🚨 Voyants allumés'], ['coffre', '🧳 Coffre'], ['arriere', '🔙 Arrière'], ['cote', '↔️ Côté'], ['roue', '🛞 Roue']];
/* 💡 v1255 — LES FEUX À ALLUMER. David, le 23 octobre : « sur certaines
   vérifs il faut que l'élève allume les feux pour les contrôler : il va
   falloir qu'il appuie sur le bon bouton un certain nombre de fois, ou
   sur un bouton puis une commande, et avoir vraiment la photo avec les
   bons feux allumés ». Ses choix : toucher la commande N fois ; ensuite
   faire le tour et toucher les feux allumés sur la vraie photo ; il
   prend lui-même ces photos (partagées entre voitures identiques).
   [id, nom, les questions qu'il sert d'habitude] */
const AT_ALLUMAGES = [['croisement', '💡 Feux de croisement', [26, 82]], ['route', '🔦 Feux de route', [20, 78, 51, 95]],
  ['position', '🅿️ Feux de position', [30, 40]], ['detresse', '⚠️ Feux de détresse', [18, 76, 31, 85]],
  ['clignotant', '➡️ Clignotant droit', [14, 74]], ['brouillard', '🌫️ Feu de brouillard arrière', [16, 43, 91]],
  ['stop', '🛑 Feux stop (frein)', [46, 90]], ['recul', '↩️ Feux de recul', [44]], ['diurnes', '☀️ Feux diurnes', [52, 92]]];
/* les endroits où une photo peut montrer des feux allumés */
const AT_ENDROITS_ALLUMES = ['volant', 'voyants', 'devant', 'arriere', 'cote'];
const AT = { d: null, voiture: '', endroit: 'volant', etat: '', zone: '', regleN: 0, cheminAussi: {}, regleAussi: {}, allumage: 'croisement', allumageAussi: {}, occupe: false, place: '', ouvert: '', cherche: '', deplacer: '' };
function atNomAllumage(a){ const x = AT_ALLUMAGES.find(y => y[0] === a); return x ? x[1] : a; }
function atAllumageDeQuestion(n){ const x = AT_ALLUMAGES.find(y => y[2].indexOf(n) !== -1); return x ? x[0] : ''; }

/* ============================================================
   📋 v1268 — LA LISTE « À PLACER SUR CETTE PHOTO »

   David, le 26 octobre : « je dois mettre les zones et ensuite chercher
   à la main à quelle question ça correspond, c'est trop compliqué :
   trouve une solution pour simplifier la création des zones, des
   boutons, et que ça se lie aux bonnes questions directement ». Et :
   « pour la question 6, il faut montrer toutes les plaques : devant ET
   derrière ; pareil pour les clignotants côté trottoir : devant, sur le
   côté et derrière ».

   Ses choix sur le schéma : la liste telle que proposée, et il peut
   ajouter, renommer, déplacer un élément depuis l'atelier ; l'élève
   montre les parties dans l'ordre qu'il veut ; une partie absente sur
   une voiture = « 🗣️ il n'y en a pas » et la question ne demande plus
   que les autres ; le chemin vers le capot se remplit tout seul
   (porte → poignée → capot), modifiable ; les feux allumés se posent
   sur les photos allumées, la liste dit ce qui manque.

   Un ÉLÉMENT = ce qu'on montre (le bocal du lave-glace), sa sorte
   (🎯 réponse, ➡️ passage, 🔘 commande), ses questions, et ses PARTIES :
   une par endroit où il faut le montrer (la plaque avant sur « Devant »,
   la plaque arrière sur « Arrière »). Une zone posée depuis la liste
   garde « el » = « plaques:2 » : c'est ce qui dit où en est la liste.
   ============================================================ */
/* [id, emoji, nom, sorte, questions, [[endroit, feux allumés, nom de la partie]…]] */
const AT_ELEMENTS_LISTE = [
  /* 🔧 capot ouvert */
  ['lave-glace', '🫙', 'Le bocal du lave-glace', 'reponse', [2, 50], [['capot']]],
  ['refroidissement', '🌡️', 'Le bocal du liquide de refroidissement', 'reponse', [12, 72], [['capot']]],
  ['liquide-frein', '🛑', 'Le bocal du liquide de frein', 'reponse', [8, 70], [['capot']]],
  ['jauge', '🛢️', 'La jauge d’huile', 'reponse', [22, 80], [['capot']]],
  ['bouchon-huile', '🛢️', 'Le bouchon de remplissage d’huile', 'reponse', [36], [['capot']]],
  ['batterie', '🔋', 'La batterie', 'reponse', [24], [['capot']]],
  ['ampoules-avant', '💡', 'L’accès aux ampoules avant', 'reponse', [56, 96], [['capot']]],
  ['capot-fermer', '🔒', 'Le capot (le refermer, vérifier)', 'reponse', [48, 64], [['capot']]],
  /* 🪑 au volant */
  ['porte', '🚪', 'La porte (pour sortir)', 'passage', [], [['volant']]],
  ['bague', '🔘', 'La bague des feux', 'commande', [], [['volant']]],
  ['comodo', '🔘', 'Le comodo des clignotants', 'commande', [], [['volant']]],
  ['bouton-detresse', '⚠️', 'Le bouton des feux de détresse', 'commande', [31, 85], [['volant']]],
  ['pedale-frein', '🦶', 'La pédale de frein', 'commande', [], [['volant']]],
  ['levier', '🕹️', 'Le levier de vitesse (marche arrière)', 'commande', [], [['volant']]],
  ['hauteur-feux', '🔆', 'La commande de hauteur des feux', 'reponse', [1, 65], [['volant']]],
  ['retroviseur', '🪞', 'Le rétroviseur intérieur (position nuit)', 'reponse', [3, 67], [['volant']]],
  ['essuie-avant', '🌧️', 'La commande des essuie-glaces avant', 'reponse', [5, 69], [['volant']]],
  ['essuie-arriere', '🌧️', 'La commande de l’essuie-glace arrière', 'reponse', [59, 97], [['volant']]],
  ['carburant', '⛽', 'L’indicateur de carburant', 'reponse', [11], [['volant']]],
  ['degivrage', '❄️', 'Le dégivrage de la lunette arrière', 'reponse', [13, 73], [['volant']]],
  ['reglage-volant', '🎡', 'Le réglage du volant', 'reponse', [19], [['volant']]],
  ['pare-brise', '🌬️', 'L’air vers le pare-brise', 'reponse', [21, 79], [['volant']]],
  ['regulateur', '🚗', 'La commande du régulateur', 'reponse', [33], [['volant']]],
  ['limiteur', '🚦', 'La commande du limiteur', 'reponse', [57], [['volant']]],
  ['klaxon', '📯', 'L’avertisseur sonore', 'reponse', [35], [['volant']]],
  ['airbag', '🎈', 'La désactivation de l’airbag passager', 'reponse', [37, 87], [['passager']]],
  ['recyclage', '🔁', 'Le recyclage de l’air', 'reponse', [49, 93], [['volant']]],
  ['appui-tete', '💺', 'Le réglage de l’appui-tête', 'reponse', [45], [['volant']]],
  ['carte-grise', '📄', 'La carte grise', 'reponse', [9], [['volant']]],
  ['assurance', '📄', 'L’attestation d’assurance et la vignette', 'reponse', [41], [['volant']]],
  ['constat', '📄', 'Le constat amiable', 'reponse', [53], [['volant']]],
  ['ethylotest', '🧪', 'L’éthylotest', 'reponse', [17, 77], [['volant']]],
  ['gilet', '🦺', 'Le gilet de haute visibilité', 'reponse', [7, 71], [['volant']]],
  ['isofix', '👶', 'Les attaches Isofix', 'reponse', [61], [['sieges']]],
  /* 🚨 voyants allumés */
  ['voyant-huile', '🚨', 'Le voyant de pression d’huile', 'reponse', [15, 75], [['voyants']]],
  ['voyant-batterie', '🚨', 'Le voyant de batterie', 'reponse', [23], [['voyants']]],
  ['voyant-freinage', '🚨', 'Le voyant de freinage', 'reponse', [25, 55, 81], [['voyants']]],
  ['voyant-temperature', '🚨', 'Le voyant de température', 'reponse', [27, 83], [['voyants']]],
  ['voyant-portiere', '🚨', 'Le voyant de portière ouverte', 'reponse', [29], [['voyants']]],
  ['voyant-ceinture', '🚨', 'Le voyant de ceinture', 'reponse', [39, 89], [['voyants']]],
  ['voyant-brouillard', '🚨', 'Le voyant du feu de brouillard arrière', 'reponse', [47], [['voyants']]],
  ['voyant-pneus', '🚨', 'Le voyant de pression des pneus', 'reponse', [63, 99], [['voyants']]],
  ['voyant-brouillard-allume', '🌫️', 'Le voyant de brouillard, feu allumé', 'reponse', [43, 91], [['voyants', 'brouillard']]],
  ['voyant-route-allume', '🔦', 'Le voyant des feux de route, allumés', 'reponse', [51, 95], [['voyants', 'route']]],
  /* 🚪 porte ouverte */
  ['poignee-capot', '➡️', 'La poignée d’ouverture du capot', 'passage', [], [['porte']]],
  ['plaque-pressions', '🏷️', 'La plaque des pressions des pneus', 'reponse', [38, 86], [['porte']]],
  ['securite-enfant', '🔒', 'La sécurité enfant', 'reponse', [42, 88], [['portiere']]],
  /* 🚶 devant — et ce qui se montre à plusieurs endroits */
  ['capot-ouvrir', '➡️', 'Le capot (l’ouvrir)', 'passage', [], [['devant']]],
  ['plaques', '🔢', 'Les plaques d’immatriculation', 'reponse', [6], [['devant', '', 'la plaque avant'], ['arriere', '', 'la plaque arrière']]],
  ['gicleurs', '💦', 'Les gicleurs de lave-glace', 'reponse', [66, 100], [['devant']]],
  ['balais', '🪟', 'Les balais d’essuie-glace', 'reponse', [10], [['devant', '', 'les balais avant'], ['arriere', '', 'le balai arrière']]],
  ['feux-croisement', '💡', 'Les feux de croisement', 'reponse', [26, 82], [['devant', 'croisement']]],
  ['feux-route', '🔦', 'Les feux de route', 'reponse', [20, 78], [['devant', 'route']]],
  ['feux-diurnes', '☀️', 'Les feux diurnes', 'reponse', [52, 92], [['devant', 'diurnes']]],
  ['feux-position', '🅿️', 'Les feux de position', 'reponse', [30], [['devant', 'position', 'les feux de position avant'], ['arriere', 'position', 'les feux de position arrière']]],
  ['feux-detresse', '⚠️', 'Les feux de détresse', 'reponse', [18, 76], [['devant', 'detresse', 'les feux de détresse avant'], ['arriere', 'detresse', 'les feux de détresse arrière']]],
  ['clignotants', '➡️', 'Les clignotants côté trottoir', 'reponse', [14, 74], [['devant', 'clignotant', 'le clignotant avant droit'], ['cote', 'clignotant', 'le répétiteur sur le côté'], ['arriere', 'clignotant', 'le clignotant arrière droit']]],
  /* ↔️ côté */
  ['trappe', '⛽', 'La trappe à carburant', 'reponse', [34], [['cote']]],
  /* 🔙 arrière */
  ['coffre-ouvrir', '➡️', 'Le coffre (l’ouvrir)', 'passage', [], [['arriere']]],
  ['eclairage-plaque', '💡', 'L’éclairage de la plaque arrière', 'reponse', [40], [['arriere', 'position']]],
  ['ampoules-arriere', '💡', 'L’accès aux ampoules arrière', 'reponse', [58, 98], [['arriere']]],
  ['reflechissants', '🔶', 'Les dispositifs réfléchissants', 'reponse', [28], [['arriere']]],
  ['feu-brouillard', '🌫️', 'Le feu de brouillard arrière', 'reponse', [16], [['arriere', 'brouillard']]],
  ['feux-stop', '🛑', 'Les feux stop', 'reponse', [46, 90], [['arriere', 'stop']]],
  ['feux-recul', '↩️', 'Les feux de recul', 'reponse', [44], [['arriere', 'recul']]],
  /* 🧳 coffre */
  ['coffre-fermer', '🧳', 'Le coffre (le refermer, vérifier)', 'reponse', [60, 62], [['coffre']]],
  ['triangle', '⚠️', 'Le triangle', 'reponse', [54, 94], [['coffre']]],
  /* 🛞 roue */
  ['flanc', '🛞', 'Le flanc du pneu', 'reponse', [4, 68], [['roue']]],
  ['temoin-usure', '🔍', 'Le témoin d’usure', 'reponse', [32, 84], [['roue']]]
].map(([id, ic, nom, sorte, questions, parties]) => ({ id, ic, nom, sorte, questions,
  parties: parties.map(([endroit, etat, n]) => ({ endroit: endroit, etat: etat || '', nom: n || '' })) }));

/* 🧭 les chemins qui se remplissent tout seuls : l'endroit, et les
   passages à toucher dans l'ordre (élément:partie) */
const AT_CHEMINS_AUTO = { porte: ['porte:1'], passager: ['porte:1'], portiere: ['porte:1'], sieges: ['porte:1'], devant: ['porte:1'], arriere: ['porte:1'], cote: ['porte:1'], roue: ['porte:1'],
  capot: ['porte:1', 'poignee-capot:1', 'capot-ouvrir:1'], coffre: ['porte:1', 'coffre-ouvrir:1'] };

function atElements(){ const r = atReglages(); return Array.isArray(r.elements) && r.elements.length ? ((r.listeVue || 0) >= 1271 ? r.elements : atListeCorrigee(r.elements)) : AT_ELEMENTS_LISTE; }
/* 🧤 v1271 — une liste déjà enregistrée garde l'ancien endroit de
   l'airbag, de l'Isofix et de la sécurité enfant : on les range à leur
   nouvelle place, sauf si une zone les montre déjà quelque part. Une
   seule fois : la liste enregistrée ensuite porte « listeVue: 1271 »,
   et un déplacement fait à la main n'est plus jamais corrigé. */
const AT_ANCIENS_ENDROITS = { airbag: 'volant', isofix: 'volant', 'securite-enfant': 'porte' };
function atListeCorrigee(l){
  if(!l.some(el => AT_ANCIENS_ENDROITS[el.id])) return l;
  return l.map(el => {
    const avant = AT_ANCIENS_ENDROITS[el.id];
    if(!avant || el.parties.length !== 1 || el.parties[0].endroit !== avant || el.parties[0].etat) return el;
    const pose = atPhotos().some(p => (p.zones || []).some(z => z.el === el.id + ':1'
      || (!z.el && z.sorte !== 'passage' && (z.questions || []).some(q => el.questions.indexOf(q) !== -1))));
    if(pose) return el;
    const neuf = AT_ELEMENTS_LISTE.find(x => x.id === el.id);
    return Object.assign({}, el, { parties: [Object.assign({}, el.parties[0], { endroit: neuf.parties[0].endroit })] });
  });
}
function atNormal(t){ return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim(); }
function atNomPartie(el, k){ const p = el.parties[k - 1]; return (p && p.nom) || el.nom.replace(/^(Le |La |Les |L’)/, (m) => m.toLowerCase()); }
/* La zone qui tient une partie, sur la photo de cette voiture — posée
   depuis la liste (« el »), ou dessinée avant la v1268 (ses questions,
   ou son nom pour un passage, une commande) */
function atZoneDePartie(v, el, k){
  const pa = el.parties[k - 1];
  if(!pa) return null;
  const p = atPhotoDe(v, pa.endroit, pa.etat);
  if(!p) return null;
  const cle = el.id + ':' + k;
  let z = p.zones.find(x => x.el === cle);
  if(!z) z = p.zones.find(x => !x.el && x.sorte === el.sorte && (el.questions.length
    ? (x.questions || []).some(q => el.questions.indexOf(q) !== -1)
    : atNormal(x.nom) && (atNormal(x.nom) === atNormal(atNomPartie(el, k)) || atNormal(el.nom).indexOf(atNormal(x.nom)) !== -1)));
  return z ? { photo: p, zone: z } : null;
}
function atPlaceEnCours(){
  if(!AT.place) return null;
  const [id, k] = AT.place.split(':');
  const el = atElements().find(x => x.id === id);
  const pa = el && el.parties[Number(k) - 1];
  if(!pa || pa.endroit !== AT.endroit || (pa.etat || '') !== (AT.etat || '')) return null;
  return { el: el, k: Number(k) };
}
function atAbsent(v, el, k){
  if(((atReglages().absents || {})[v] || []).indexOf(el.id + ':' + k) !== -1) return 'dire';
  /* un élément d'une seule partie, réglé « à dire » / « ordinateur de bord » question par question */
  if(el.parties.length === 1 && el.questions.length){
    const m = el.questions.map(q => atRegle(v, q)).filter(Boolean);
    if(m.length === el.questions.length && m.every(r => r.mode === 'dire' || r.mode === 'ordi')) return m[0].mode;
  }
  return '';
}
/* Ce qui se place sur la photo affichée : [{ el, k }] */
function atPartiesIci(){
  const l = [];
  atElements().forEach(el => el.parties.forEach((pa, i) => { if(pa.endroit === AT.endroit && (pa.etat || '') === (AT.etat || '')) l.push({ el: el, k: i + 1 }); }));
  return l;
}
function atNomLieu(pa){ return atNomEndroit(pa.endroit) + (pa.etat ? ' (' + atNomAllumage(pa.etat) + ' allumés)' : ''); }

/* La colonne de droite : la liste */
function atPanneauListe(v){
  const b = vqEl('div', 'atP atListe');
  const p = atPhotoDe(v, AT.endroit, AT.etat);
  const nomVue = atNomEndroit(AT.endroit) + (AT.etat ? ' — ' + atNomAllumage(AT.etat) + ' allumés' : '');
  b.appendChild(vqEl('h4', '', '📋 À placer sur « ' + nomVue + ' » — ' + atVoitureNom(v)));
  const ici = atPartiesIci();
  if(!p){
    b.appendChild(vqEl('div', 'vbAide', ici.length ? 'Dépose d’abord la photo : ' + ici.length + ' chose' + (ici.length > 1 ? 's' : '') + ' s’y placeront (' + ici.slice(0, 4).map(x => atNomPartie(x.el, x.k)).join(', ') + (ici.length > 4 ? '…' : '') + ').' : 'Rien d’habituel ici : « ➕ Autre chose à placer… » pour ajouter un élément.'));
    b.appendChild(atBoutonAutre());
    return b;
  }
  /* les zones dessinées sans élément (avant la v1268, ou à la main) */
  const libres = p.zones.filter(z => !z.el && !atElements().some(el => el.parties.some((pa, i) => { const t = atZoneDePartie(v, el, i + 1); return t && t.zone === z; })));
  if(libres.length){
    const d = vqEl('div', 'atLibres');
    d.appendChild(vqEl('b', '', '🧩 À rattacher : '));
    libres.forEach(z => {
      const x = vqEl('button', 'vbPuce' + (AT.zone === z.id ? ' on' : ''), (z.nom || 'zone sans nom') + ((z.questions || []).length ? ' · ' + z.questions.join(' · ') : ''));
      x.type = 'button';
      x.setAttribute('data-libre', z.id);
      x.addEventListener('click', () => { AT.zone = z.id; AT.place = ''; atDessiner(); });
      d.appendChild(x);
    });
    d.appendChild(vqEl('div', 'vbAide', 'Touche une zone, puis dans la liste ce qu’elle montre : elle s’y rattache.'));
    b.appendChild(d);
  }
  const faits = ici.filter(x => atZoneDePartie(v, x.el, x.k) || atAbsent(v, x.el, x.k)).length;
  b.appendChild(vqEl('div', 'atCompte', faits + ' sur ' + ici.length + ' placé' + (faits > 1 ? 's' : '') + (p.voitures.length > 1 ? ' · cette photo sert aussi à ' + p.voitures.filter(x => x !== v).map(atVoitureNom).join(', ') : '')));
  const bar = vqEl('div', 'atBar'); const i0 = vqEl('i', ''); i0.style.width = (ici.length ? Math.round(faits * 100 / ici.length) : 0) + '%'; bar.appendChild(i0); b.appendChild(bar);
  const l = vqEl('div', 'atEls');
  ici.forEach(({ el, k }) => l.appendChild(atLigneElement(v, el, k)));
  b.appendChild(l);
  if(!ici.length) b.appendChild(vqEl('div', 'vbAide', 'Rien d’habituel sur cette photo.'));
  b.appendChild(vqEl('div', 'vbAide', 'Touche une ligne, puis glisse sur la photo : la zone est enregistrée avec son nom et ses questions.'));
  b.appendChild(atPanneauAilleurs(v));
  b.appendChild(atBoutonAutre());
  return b;
}
/* 🔎 v1270 — TOUT LE RESTE, D'OÙ QU'IL SOIT. David, le 26 octobre :
   « c'est galère encore, tu as mis des questions qui ne sont pas pour
   les bonnes photos ». La liste n'est qu'une proposition : ce qu'on
   trouve ICI sur nos voitures, c'est lui qui le voit. Ici, tout ce qui
   reste à placer, cherché par mot ou par numéro ; le toucher le RANGE sur
   cette photo (pour la suite aussi) et on le dessine aussitôt. */
function atPanneauAilleurs(v){
  const d = vqEl('div', 'atAilleurs');
  d.appendChild(vqEl('div', 'vbLab', '🔎 Autre chose sur cette photo ? Tout ce qui reste à placer'));
  const ch = vqEl('input', 'vbIn atCherche');
  ch.type = 'text';
  ch.placeholder = 'Un mot ou un numéro : « plaque », « pression », « 38 »…';
  ch.value = AT.cherche || '';
  ch.setAttribute('data-hors-saisie', '1');
  d.appendChild(ch);
  const l = vqEl('div', 'atAutres');
  d.appendChild(l);
  const remplir = () => {
    l.innerHTML = '';
    const mots = atNormal(ch.value).split(' ').filter(Boolean);
    const out = [];
    atElements().forEach(el => el.parties.forEach((pa, i) => {
      const k = i + 1;
      if(pa.endroit === AT.endroit && (pa.etat || '') === (AT.etat || '')) return;
      if(atZoneDePartie(v, el, k) || atAbsent(v, el, k)) return;
      const qs = el.questions.map(q => ((verifsQuestion(q) || {}).verif) || '').join(' ');
      const t = atNormal(el.nom + ' ' + atNomPartie(el, k) + ' ' + qs) + ' ' + el.questions.join(' ');
      if(mots.length && !mots.every(m => /^\d+$/.test(m) ? el.questions.indexOf(Number(m)) !== -1 : t.indexOf(m) !== -1)) return;
      out.push({ el, k, pa });
    }));
    if(!out.length){ l.appendChild(vqEl('div', 'vbAide', mots.length ? 'Rien ne correspond : « ➕ Autre chose à placer… » pour l’ajouter.' : 'Tout est placé ou réglé.')); return; }
    out.forEach(({ el, k, pa }) => {
      const x = vqEl('button', 'atAutre');
      x.type = 'button';
      x.setAttribute('data-autre', el.id + ':' + k);
      x.appendChild(vqEl('span', 'ic', el.ic || '🎯'));
      const t = vqEl('span', 't');
      t.appendChild(vqEl('b', '', el.parties.length > 1 ? el.nom + ' — ' + atNomPartie(el, k) : el.nom));
      t.appendChild(vqEl('small', '', (el.questions.length ? 'Q ' + el.questions.join(' · ') + ' · ' : '') + 'rangé sur ' + atNomLieu(pa)));
      x.appendChild(t);
      x.appendChild(vqEl('span', 'st', '＋ ici'));
      x.title = el.questions.map(q => q + ' · ' + (((verifsQuestion(q) || {}).verif) || '')).join('\n');
      x.addEventListener('click', () => atDeplacerPartie(el, k, AT.endroit, AT.etat || '', true));
      l.appendChild(x);
    });
  };
  ch.addEventListener('input', () => { AT.cherche = ch.value; remplir(); });
  remplir();
  return d;
}
/* Ranger une partie sur une autre photo (la liste modifiée est gardée) */
function atDeplacerPartie(el, k, endroit, etat, dessiner){
  const rr = atCopieReglages();
  const l = atElements().map(x => JSON.parse(JSON.stringify(x)));
  const e = l.find(x => x.id === el.id);
  if(!e || !e.parties[k - 1]) return;
  e.parties[k - 1].endroit = endroit;
  e.parties[k - 1].etat = AT_ENDROITS_ALLUMES.indexOf(endroit) !== -1 ? (etat || '') : '';
  rr.elements = l;
  const cle = el.id + ':' + k;
  return atReglagesPoser(rr, null, '📍 ' + atNomPartie(el, k) + ' : rangé sur ' + atNomLieu(e.parties[k - 1])).then(r => {
    if(!r) return;
    if(dessiner){ AT.place = cle; AT.ouvert = cle; AT.zone = ''; AT.cherche = ''; atRedessiner(); }
  });
}
function atBoutonAutre(){
  const x = vqEl('button', 'btn btn-secondary atPlus', '➕ Autre chose à placer…'); x.type = 'button';
  x.addEventListener('click', () => atEditerElement(null));
  const d = vqEl('div', 'atBtns'); d.appendChild(x); return d;
}
function atLigneElement(v, el, k){
  const cle = el.id + ':' + k;
  const t = atZoneDePartie(v, el, k);
  const abs = atAbsent(v, el, k);
  const parties = el.parties.length;
  const lesFaites = el.parties.map((pa, i) => !!(atZoneDePartie(v, el, i + 1) || atAbsent(v, el, i + 1)));
  const n = lesFaites.filter(Boolean).length;
  let cls = 'atEl', st = 'à placer';
  if(abs){ cls += ' dire'; st = abs === 'ordi' ? '🖥️ ordinateur' : '🗣️ à dire'; }
  else if(t){ cls += ' fait'; st = '✓ placé'; }
  if(parties > 1 && !abs){ cls += n === parties ? ' fait' : ' part'; st = n + ' / ' + parties; }
  if(AT.place === cle) { cls += ' encours'; st = '✏️ à dessiner'; }
  const ligne = vqEl('div', 'atElBloc');
  const b = vqEl('button', cls);
  b.type = 'button';
  b.setAttribute('data-el', cle);
  const ic = vqEl('span', 'ic', el.ic || (el.sorte === 'passage' ? '➡️' : el.sorte === 'commande' ? '🔘' : '🎯'));
  const tx = vqEl('span', 't');
  tx.appendChild(vqEl('b', '', parties > 1 ? el.nom + ' — ' + atNomPartie(el, k) : el.nom));
  tx.appendChild(vqEl('small', '', el.sorte === 'passage' ? '➡️ passage' : (el.sorte === 'commande' ? '🔘 commande' + (el.questions.length ? ' · ' : '') : '') +
    (el.questions.length ? (el.questions.length > 1 ? 'Questions ' : 'Question ') + el.questions.join(' · ') : (el.sorte === 'commande' ? '' : '')) +
    (parties > 1 ? ' · ' + parties + ' parties' : '')));
  /* v1270 — la question en clair, pour reconnaître sans chercher */
  const q0 = el.questions.length && typeof verifsQuestion === 'function' ? verifsQuestion(el.questions[0]) : null;
  if(q0) tx.appendChild(vqEl('small', 'atQTexte', q0.verif));
  b.title = el.questions.map(q => q + ' · ' + (((typeof verifsQuestion === 'function' && verifsQuestion(q)) || {}).verif || '')).join('\n');
  b.appendChild(ic); b.appendChild(tx); b.appendChild(vqEl('span', 'st', st));
  b.addEventListener('click', () => atToucherElement(v, el, k));
  ligne.appendChild(b);
  /* les parties ailleurs, et le reste à régler */
  const det = vqEl('div', 'atParts');
  if(parties > 1){
    el.parties.forEach((pa, i) => {
      if(i + 1 === k) return;
      const fait = lesFaites[i];
      const d = vqEl('div', '');
      d.appendChild(document.createTextNode((i + 1) + ' · ' + atNomPartie(el, i + 1) + ' — ' + atNomLieu(pa) + (fait ? ' ✓' : '') + ' '));
      const a = vqEl('button', 'atLienPetit', 'y aller →'); a.type = 'button';
      a.addEventListener('click', () => { AT.endroit = pa.endroit; AT.etat = pa.etat || ''; AT.zone = ''; AT.place = fait ? '' : el.id + ':' + (i + 1); atDessiner(); });
      d.appendChild(a);
      det.appendChild(d);
    });
  }
  /* 💡 une partie à feux allumés : la voiture sait-elle les allumer ? */
  const pa = el.parties[k - 1];
  if(pa.etat && t && !((atReglages().allumages[v] || {})[pa.etat] || []).length){
    det.appendChild(vqEl('div', 'atManque', '💡 Reste à dire comment les allumer : « 💡 Allumer les feux », plus bas.'));
  }
  if(det.children.length) ligne.appendChild(det);
  /* ouvert : ses gestes */
  if(AT.ouvert === cle){
    const g = vqEl('div', 'atElGestes');
    const geste = (txt, f, cl) => { const x = vqEl('button', 'vbPuce' + (cl ? ' ' + cl : ''), txt); x.type = 'button'; x.addEventListener('click', f); g.appendChild(x); };
    if(t) geste('🎯 Voir la zone', () => { AT.zone = t.zone.id; AT.place = ''; atDessiner(); });
    if(t) geste('✏️ La redessiner', () => { AT.place = cle; AT.zone = ''; atDessiner(); });
    if(abs) geste('↩️ Elle existe sur cette voiture', () => atPoserAbsent(v, el, k, ''));
    else if(el.sorte !== 'passage'){
      geste('🗣️ Pas sur cette voiture', () => atPoserAbsent(v, el, k, 'dire'));
      if(/voyant/i.test(el.nom) && parties === 1) geste('🖥️ C’est l’ordinateur de bord', () => atPoserAbsent(v, el, k, 'ordi'));
    }
    /* 📍 v1270 — pas sur cette photo : la ranger ailleurs, d'un toucher */
    if(!t && !abs){
      geste(AT.deplacer === cle ? '📍 Où est-ce ? ▾' : '📍 Pas sur cette photo…', () => { AT.deplacer = AT.deplacer === cle ? '' : cle; atDessiner(); });
    }
    geste('📝 Modifier l’élément', () => atEditerElement(el));
    ligne.appendChild(g);
    if(AT.deplacer === cle && !t && !abs){
      const ou = vqEl('div', 'atElGestes atOu');
      AT_ENDROITS.forEach(([e, nom]) => {
        if(e === AT.endroit) return;
        const x = vqEl('button', 'vbPuce' + (atPhotoDe(v, e) ? ' plein' : ''), nom);
        x.type = 'button';
        x.setAttribute('data-vers', e);
        x.addEventListener('click', () => { AT.deplacer = ''; atDeplacerPartie(el, k, e, AT_ENDROITS_ALLUMES.indexOf(e) !== -1 ? (pa.etat || '') : '', false); });
        ou.appendChild(x);
      });
      ligne.appendChild(ou);
    }
  }
  return ligne;
}
/* Toucher une ligne : rattacher la zone choisie, ou dessiner */
function atToucherElement(v, el, k){
  const cle = el.id + ':' + k;
  const p = atPhotoDe(v, AT.endroit, AT.etat);
  const zSel = p && AT.zone && p.zones.find(z => z.id === AT.zone);
  if(zSel && !zSel.el && !atElements().some(e2 => e2.parties.some((pa, i) => { const t = atZoneDePartie(v, e2, i + 1); return t && t.zone === zSel && e2 !== el; }))){
    /* 🧩 rattacher la zone choisie à cet élément */
    const zones = p.zones.map(z => z.id !== zSel.id ? z : Object.assign({}, z, { el: cle, nom: atNomPartie(el, k), sorte: el.sorte, questions: el.sorte === 'passage' ? [] : el.questions.slice() }));
    atAppel({ action: 'jeuPhotoPoser', id: p.id, endroit: p.endroit, etat: p.etat || '', nom: p.nom, voitures: p.voitures, zones: zones })
      .then(r => { if(r){ AT.zone = ''; AT.ouvert = cle; showToastVerifs('🧩 Rattachée : ' + el.nom); atApresPose(el, k); } });
    return;
  }
  const t = atZoneDePartie(v, el, k);
  AT.ouvert = AT.ouvert === cle && AT.place !== cle ? '' : cle;
  AT.place = t || atAbsent(v, el, k) ? '' : cle;
  AT.zone = '';
  atDessiner();
}
/* 🗣️ / 🖥️ / ↩️ */
function atPoserAbsent(v, el, k, mode){
  const r = atCopieReglages();
  r.absents = r.absents || {};
  const cle = el.id + ':' + k;
  const l = (r.absents[v] || []).filter(x => x !== cle);
  if(el.parties.length === 1 && el.questions.length){
    r.regles[v] = r.regles[v] || {};
    el.questions.forEach(q => {
      if(mode) r.regles[v][String(q)] = { mode: mode, dire: mode === 'ordi' ? 'C’est l’ordinateur de bord qui l’affiche.' : 'Il n’y en a pas sur cette voiture.', general: ((typeof verifsQuestion === 'function' && verifsQuestion(q)) || {}).verifRep || '' };
      else delete r.regles[v][String(q)];
    });
  }else if(mode) l.push(cle);
  if(l.length) r.absents[v] = l; else delete r.absents[v];
  AT.place = '';
  return atReglagesPoser(r, null, mode ? (mode === 'ordi' ? '🖥️ Ordinateur de bord' : '🗣️ Pas sur cette voiture') + ' : ' + atNomPartie(el, k) : '↩️ ' + atNomPartie(el, k) + ' : à placer');
}
/* Après une pose : les feux allumés se jouent « à allumer », les
   passages remplissent les chemins, et on passe à la suivante */
async function atApresPose(el, k){
  const pa = el.parties[k - 1];
  const r = atCopieReglages();
  let change = false;
  const voitures = (atPhotoDe(AT.voiture, pa.endroit, pa.etat) || { voitures: [AT.voiture] }).voitures;
  if(pa.etat && el.sorte !== 'passage'){
    voitures.forEach(v => {
      r.regles[v] = r.regles[v] || {};
      el.questions.forEach(q => { if(!r.regles[v][String(q)]){ r.regles[v][String(q)] = { mode: 'allumer', allumage: pa.etat }; change = true; } });
    });
  }
  if(atCheminsAuto(r)) change = true;
  if(change){ await atAppel({ action: 'jeuReglagesPoser', reglages: r }); AT.cheminEdit = null; }
  /* la suivante, sur cette photo */
  const v = AT.voiture;
  const reste = atPartiesIci().find(x => !atZoneDePartie(v, x.el, x.k) && !atAbsent(v, x.el, x.k));
  AT.place = reste ? reste.el.id + ':' + reste.k : '';
  AT.ouvert = AT.place;
  atRedessiner();
}
/* 🧭 Les chemins tout seuls, pour chaque voiture, là où il n'y en a pas */
/* … et après une photo déposée ou partagée : l'endroit qui manquait est peut-être là */
async function atCheminsAutoPoser(){
  const r = atCopieReglages();
  if(atCheminsAuto(r)){ await atAppel({ action: 'jeuReglagesPoser', reglages: r }); AT.cheminEdit = null; }
}
function atCheminsAuto(r){
  let change = false;
  (r.voitures || []).forEach(vv => {
    const v = vv.id;
    Object.keys(AT_CHEMINS_AUTO).forEach(e => {
      if(((r.chemins[v] || {})[e] || []).length) return;
      const etapes = [];
      for(const cle of AT_CHEMINS_AUTO[e]){
        const [id, k] = cle.split(':');
        const el = atElements().find(x => x.id === id);
        const t = el && atZoneDePartie(v, el, Number(k));
        if(!t) return;
        etapes.push({ photo: t.photo.id, zone: t.zone.id });
      }
      /* seulement si la voiture a une photo de cet endroit */
      if(!atPhotoDe(v, e)) return;
      r.chemins[v] = r.chemins[v] || {};
      r.chemins[v][e] = etapes;
      change = true;
    });
  });
  return change;
}

/* 📝 Ajouter, renommer, déplacer un élément */
function atEditerElement(el){
  const neuf = !el;
  const e = el ? JSON.parse(JSON.stringify(el)) : { id: '', ic: '🎯', nom: '', sorte: 'reponse', questions: [], parties: [{ endroit: AT.endroit, etat: AT.etat || '', nom: '' }] };
  const fond = vqEl('div', 'overlay show');
  const m = vqEl('div', 'modal atModal');
  m.style.cssText = 'max-width:min(560px, 96vw);max-height:92vh;overflow-y:auto;text-align:left;';
  m.appendChild(vqEl('h3', '', neuf ? '➕ Autre chose à placer' : '📝 ' + e.nom));
  const champ = (lab, val, ph) => { m.appendChild(vqEl('div', 'vbLab', lab)); const i = vqEl('input', 'vbIn'); i.type = 'text'; i.value = val || ''; i.placeholder = ph || ''; i.setAttribute('data-hors-saisie', '1'); m.appendChild(i); return i; };
  const ic = champ('Emoji', e.ic, '🎯');
  ic.style.maxWidth = '90px';
  const nom = champ('Son nom (dit à l’élève quand il le touche par erreur)', e.nom, 'Ex : le bocal du lave-glace');
  m.appendChild(vqEl('div', 'vbLab', 'C’est'));
  const ch = vqEl('div', 'vbChx');
  [['reponse', '🎯 La réponse à des questions'], ['passage', '➡️ Un passage'], ['commande', '🔘 Une commande']].forEach(([k, t]) => {
    const x = vqEl('button', 'vbPuce' + (e.sorte === k ? ' on' : ''), t); x.type = 'button';
    x.addEventListener('click', () => { e.sorte = k; ch.querySelectorAll('.vbPuce').forEach(y => y.classList.toggle('on', y === x)); zq.style.display = k === 'passage' ? 'none' : ''; });
    ch.appendChild(x);
  });
  m.appendChild(ch);
  /* les questions : cherchées par mot, pas par numéro */
  const zq = vqEl('div', '');
  zq.appendChild(vqEl('div', 'vbLab', 'Ses questions'));
  const choisies = vqEl('div', 'vbChx');
  const cherche = vqEl('input', 'vbIn'); cherche.type = 'text'; cherche.placeholder = '🔎 Un mot : « lave-glace », « plaque », « voyant »…'; cherche.setAttribute('data-hors-saisie', '1');
  const res = vqEl('div', 'atRes');
  const majQ = () => {
    choisies.innerHTML = '';
    e.questions.forEach(q => {
      const x = vqEl('button', 'vbPuce on', q + ' ✕'); x.type = 'button'; x.title = ((verifsQuestion(q) || {}).verif) || '';
      x.addEventListener('click', () => { e.questions = e.questions.filter(y => y !== q); majQ(); voir(); });
      choisies.appendChild(x);
    });
    if(!e.questions.length) choisies.appendChild(vqEl('span', 'vbAide', 'aucune pour l’instant'));
  };
  const voir = () => {
    res.innerHTML = '';
    const mots = atNormal(cherche.value).split(' ').filter(x => x.length > 1);
    if(!mots.length) return;
    for(let q = 1; q <= 100; q++){
      const x = verifsQuestion(q);
      if(!x || e.questions.indexOf(q) !== -1) continue;
      const t = atNormal(x.verif);
      if(!mots.every(w => t.indexOf(w) !== -1)) continue;
      const b = vqEl('button', 'atRe', q + ' · ' + x.verif); b.type = 'button';
      b.addEventListener('click', () => { e.questions.push(q); e.questions.sort((a, c) => a - c); majQ(); voir(); });
      res.appendChild(b);
      if(res.children.length >= 8) break;
    }
  };
  cherche.addEventListener('input', voir);
  zq.appendChild(choisies); zq.appendChild(cherche); zq.appendChild(res);
  zq.style.display = e.sorte === 'passage' ? 'none' : '';
  m.appendChild(zq);
  majQ();
  /* ses parties : où il faut le montrer */
  m.appendChild(vqEl('div', 'vbLab', 'Où il faut le montrer (une ligne par partie : devant ET derrière…)'));
  const zp = vqEl('div', 'atPartiesEd');
  const majP = () => {
    zp.innerHTML = '';
    e.parties.forEach((pa, i) => {
      const li = vqEl('div', 'atPartieEd');
      const se = vqEl('select', 'vbIn');
      AT_ENDROITS.forEach(([x, t]) => se.appendChild(new Option(t, x)));
      se.value = pa.endroit;
      const sf = vqEl('select', 'vbIn');
      [['', 'feux éteints']].concat(AT_ALLUMAGES.map(a => [a[0], a[1] + ' allumés'])).forEach(([x, t]) => sf.appendChild(new Option(t, x)));
      sf.value = pa.etat || '';
      const montreFeux = () => { sf.style.display = AT_ENDROITS_ALLUMES.indexOf(se.value) !== -1 ? '' : 'none'; if(sf.style.display === 'none') sf.value = ''; };
      se.addEventListener('change', () => { pa.endroit = se.value; montreFeux(); pa.etat = sf.value; });
      sf.addEventListener('change', () => { pa.etat = sf.value; });
      montreFeux();
      const n = vqEl('input', 'vbIn'); n.type = 'text'; n.value = pa.nom || ''; n.placeholder = e.parties.length > 1 ? 'Ex : la plaque avant' : 'le même nom';
      n.setAttribute('data-hors-saisie', '1');
      n.addEventListener('input', () => { pa.nom = n.value; });
      li.appendChild(se); li.appendChild(sf); li.appendChild(n);
      if(e.parties.length > 1){ const x = vqEl('button', 'atMini', '✕'); x.type = 'button'; x.title = 'Retirer cette partie'; x.addEventListener('click', () => { e.parties.splice(i, 1); majP(); }); li.appendChild(x); }
      zp.appendChild(li);
    });
  };
  majP();
  m.appendChild(zp);
  const plus = vqEl('button', 'btn btn-secondary atPlus', '➕ Une partie de plus'); plus.type = 'button';
  plus.addEventListener('click', () => { e.parties.push({ endroit: 'arriere', etat: '', nom: '' }); majP(); });
  m.appendChild(plus);
  const r = vqEl('div', 'btn-row');
  if(!neuf){
    const bs = vqEl('button', 'btn btn-secondary', '🗑️ Retirer de la liste'); bs.type = 'button';
    bs.addEventListener('click', async () => {
      if(!await confirmer('Retirer « ' + e.nom + ' » de la liste ? Les zones déjà posées restent sur les photos.', 'Retirer un élément', true)) return;
      const rr = atCopieReglages();
      rr.elements = atElements().filter(x => x.id !== e.id);
      atReglagesPoser(rr, bs, 'Retiré de la liste').then(x => { if(x) fermerFond(fond); });
    });
    r.appendChild(bs);
  }
  const ba = vqEl('button', 'btn btn-secondary', 'Annuler'); ba.type = 'button';
  ba.addEventListener('click', () => fermerFond(fond));
  const bo = vqEl('button', 'btn btn-primary', '💾 Enregistrer'); bo.type = 'button';
  bo.addEventListener('click', () => {
    e.nom = nom.value.trim(); e.ic = ic.value.trim();
    if(!e.nom){ showToastVerifs('Donne-lui un nom.'); return; }
    if(e.sorte === 'passage') e.questions = [];
    if(neuf){
      let id = atNormal(e.nom).replace(/ /g, '-').slice(0, 30) || 'element', i = 2;
      const base = id;
      while(atElements().some(x => x.id === id)) id = base + '-' + (i++);
      e.id = id;
    }
    const rr = atCopieReglages();
    const l = atElements().map(x => JSON.parse(JSON.stringify(x)));
    const j = l.findIndex(x => x.id === e.id);
    if(j === -1) l.push(e); else l[j] = e;
    rr.elements = l;
    atReglagesPoser(rr, bo, '📝 ' + e.nom + ' : enregistré').then(x => {
      if(!x) return;
      fermerFond(fond);
      /* le nouvel élément tout de suite à dessiner, s'il est sur cette photo */
      const k = e.parties.findIndex(pa => pa.endroit === AT.endroit && (pa.etat || '') === (AT.etat || ''));
      if(neuf && k !== -1){ AT.place = e.id + ':' + (k + 1); AT.ouvert = AT.place; atRedessiner(); }
    });
  });
  r.appendChild(ba); r.appendChild(bo);
  m.appendChild(r);
  fond.appendChild(m);
  document.body.appendChild(fond);
}

function atNomEndroit(e){ const x = AT_ENDROITS.find(y => y[0] === e); return x ? x[1] : e; }
function atReglages(){ const r = (AT.d && AT.d.reglages) || { voitures: [], chemins: {}, regles: {} }; if(!r.allumages) r.allumages = {}; return r; }
function atPhotos(){ return (AT.d && AT.d.photos) || []; }
function atPhotoDe(v, e, etat){ return atPhotos().find(p => p.endroit === e && (p.etat || '') === (etat || '') && p.voitures.indexOf(v) !== -1) || null; }
/* 💡 Les zones à toucher pour CONTRÔLER la question n, sur les photos où
   les feux « a » sont allumés (pour la voiture v) */
function atZonesControle(v, n, a){
  const l = [];
  atPhotos().forEach(p => {
    if(p.etat !== a || p.voitures.indexOf(v) === -1 || atPhotoDe(v, p.endroit, a) !== p) return;
    p.zones.forEach(z => { if(z.sorte === 'reponse' && (z.questions || []).indexOf(n) !== -1) l.push({ photo: p, zone: z }); });
  });
  return l;
}
function atVoitureNom(id){ const v = atReglages().voitures.find(x => x.id === id); return v ? v.nom : id; }
function atLien(p){ const l = p && p.lien; if(!l) return ''; return l.charAt(0) === '/' ? String((typeof CONFIG !== 'undefined' && CONFIG.WORKER_URL) || '').replace(/\/$/, '') + l : l; }
function atIdVoiture(nom){
  const base = String(nom || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'voiture';
  let id = base, i = 2;
  while(atReglages().voitures.some(v => v.id === id)) id = base + '-' + (i++);
  return id;
}
function atNouvelId(p){ let i = 1; while(p.zones.some(z => z.id === 'z' + i)) i++; return 'z' + i; }
/* La zone qui répond à n sur la voiture v (sur LA photo de son endroit) */
function atZoneReponse(v, n){
  for(const p of atPhotos()){
    if(p.voitures.indexOf(v) === -1 || atPhotoDe(v, p.endroit) !== p) continue;
    /* 📋 v1268 — une 🔘 commande peut aussi répondre (le bouton des feux de détresse) */
    const z = p.zones.find(z => z.sorte !== 'passage' && (z.questions || []).indexOf(n) !== -1);
    if(z) return { photo: p, zone: z };
  }
  return null;
}
function atRegle(v, n){ const r = atReglages().regles[v]; return (r && r[String(n)]) || null; }

/* ---------- Lire, écrire ---------- */
async function atAppel(c, bouton){
  if(AT.occupe) return null;
  AT.occupe = true;
  if(bouton) bouton.disabled = true;
  try{
    const r = await appelPrep(c);
    if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
    AT.d = { reglages: r.reglages, photos: r.photos };
    return r;
  }catch(e){
    showToastVerifs('⚠️ ' + ((e && e.message) || e));
    return null;
  }finally{
    AT.occupe = false;
    if(bouton) bouton.disabled = false;
  }
}
async function afficherAtelierJeu(z){
  AT.racine = z;
  if(!AT.d){
    z.innerHTML = '<div class="empty">Lecture de l’atelier…</div>';
    const r = await atAppel({ action: 'jeuAtelierLire' });
    if(!r){ z.innerHTML = '<div class="empty">⚠️ L’atelier ne répond pas.</div>'; return; }
  }
  if(!AT.voiture || !atReglages().voitures.some(v => v.id === AT.voiture)) AT.voiture = (atReglages().voitures[0] || {}).id || '';
  atDessiner();
}
function atRedessiner(){ if(AT.racine && document.body.contains(AT.racine)) atDessiner(); }
function atReglagesPoser(reg, bouton, dit){
  return atAppel({ action: 'jeuReglagesPoser', reglages: reg }, bouton).then(r => { if(r){ if(dit) showToastVerifs(dit); atRedessiner(); } return r; });
}
function atCopieReglages(){
  const r = JSON.parse(JSON.stringify(atReglages()));
  if(Array.isArray(r.elements) && r.elements.length && (r.listeVue || 0) < 1271) r.elements = JSON.parse(JSON.stringify(atListeCorrigee(r.elements)));
  r.listeVue = 1271;
  return r;
}

/* ---------- La page ---------- */
function atDessiner(){
  const z = AT.racine;
  z.innerHTML = '';
  z.appendChild(vqEl('div', 'vbIntro', 'Pour chaque voiture : une photo par endroit. À droite, 📋 ce qui se place sur la photo affichée, déjà relié à ses questions : touche une ligne, glisse sur la photo, c’est enregistré. Ce qui se montre à plusieurs endroits (les plaques, les clignotants) a une partie par photo. Une question sans rien se joue quand même, en questions-réponses.'));
  const g = vqEl('div', 'atGrille');
  g.appendChild(atColVoitures());
  g.appendChild(atColPhoto());
  g.appendChild(atColReglages());
  z.appendChild(g);
}

/* ---------- 1 · Les voitures ---------- */
function atColVoitures(){
  const c = vqEl('div', 'atCol');
  c.appendChild(vqEl('div', 'vbLab', '🚗 Les voitures du jeu'));
  const reg = atReglages();
  reg.voitures.forEach(v => {
    let n = 0;
    for(let q = 1; q <= 100; q++) if(atZoneReponse(v.id, q) || atRegle(v.id, q)) n++;
    const b = vqEl('button', 'atVoit' + (v.id === AT.voiture ? ' on' : ''));
    b.type = 'button';
    b.setAttribute('data-voiture', v.id);
    b.appendChild(vqEl('b', '', '🚗 ' + v.nom));
    b.appendChild(vqEl('small', '', (v.boite ? v.boite + ' · ' : '') + n + ' question(s) placée(s) · ' + AT_ENDROITS.filter(e => atPhotoDe(v.id, e[0])).length + ' photo(s)'));
    const bar = vqEl('div', 'atBar'); const i = vqEl('i', ''); i.style.width = n + '%'; bar.appendChild(i); b.appendChild(bar);
    b.addEventListener('click', () => { AT.voiture = v.id; AT.zone = ''; atDessiner(); });
    c.appendChild(b);
  });
  if(!reg.voitures.length) c.appendChild(vqEl('div', 'vbAide', 'Aucune voiture pour l’instant : ajoute la première.'));
  /* ajouter */
  const f = vqEl('div', 'atAjout');
  const nom = vqEl('input', 'vbIn'); nom.type = 'text'; nom.placeholder = 'Ex : A3 n°2'; nom.setAttribute('data-hors-saisie', '1');
  const boite = vqEl('select', 'vbIn'); [['', 'Boîte ?'], ['BV', 'BV (manuelle)'], ['BEA', 'BEA (automatique)']].forEach(([v, t]) => boite.appendChild(new Option(t, v)));
  const ok = vqEl('button', 'btn btn-secondary', '➕ Ajouter une voiture'); ok.type = 'button';
  ok.addEventListener('click', () => {
    const t = nom.value.trim();
    if(!t){ showToastVerifs('Écris le nom de la voiture.'); return; }
    const r = atCopieReglages();
    const id = atIdVoiture(t);
    r.voitures.push({ id: id, nom: t, boite: boite.value });
    AT.voiture = id;
    atReglagesPoser(r, ok, '🚗 ' + t + ' ajoutée');
  });
  f.appendChild(nom); f.appendChild(boite); f.appendChild(ok);
  c.appendChild(f);
  const v = reg.voitures.find(x => x.id === AT.voiture);
  if(v){
    const ret = vqEl('button', 'atLien', '🗑️ Retirer « ' + v.nom + ' » du jeu'); ret.type = 'button';
    ret.addEventListener('click', async () => {
      if(!await confirmer('Retirer « ' + v.nom + ' » du jeu ? Ses chemins et ses règles partent avec elle ; les photos restent pour les autres voitures.', 'Retirer une voiture', true)) return;
      const r = atCopieReglages();
      r.voitures = r.voitures.filter(x => x.id !== v.id);
      delete r.chemins[v.id]; delete r.regles[v.id];
      AT.voiture = '';
      atReglagesPoser(r, ret, 'Voiture retirée').then(() => { AT.voiture = (atReglages().voitures[0] || {}).id || ''; atRedessiner(); });
    });
    c.appendChild(ret);
  }
  return c;
}

/* ---------- 2 · La photo d'un endroit, et ses zones ---------- */
function atColPhoto(){
  const c = vqEl('div', 'atCol atColLarge');
  const v = AT.voiture;
  if(!v){ c.appendChild(vqEl('div', 'empty', 'Ajoute une voiture pour commencer.')); return c; }
  const ch = vqEl('div', 'atEndroits');
  AT_ENDROITS.forEach(([e, t]) => {
    const b = vqEl('button', 'vbPuce' + (e === AT.endroit ? ' on' : '') + (atPhotoDe(v, e) ? ' plein' : ''), t + (atPhotoDe(v, e) ? ' ✓' : ''));
    b.type = 'button';
    b.setAttribute('data-endroit', e);
    b.addEventListener('click', () => { AT.endroit = e; AT.zone = ''; AT.place = ''; AT.ouvert = ''; if(AT_ENDROITS_ALLUMES.indexOf(e) === -1) AT.etat = ''; atDessiner(); });
    ch.appendChild(b);
  });
  c.appendChild(ch);
  /* 💡 v1255 — la même vue, feux éteints ou avec tel feu allumé */
  if(AT_ENDROITS_ALLUMES.indexOf(AT.endroit) !== -1){
    c.appendChild(vqEl('div', 'vbLab', '💡 Les feux sur cette photo'));
    const ce = vqEl('div', 'atEndroits atEtats');
    [['', '🌑 Éteints (photo normale)']].concat(AT_ALLUMAGES).forEach(([a, t]) => {
      const a2 = atPhotoDe(v, AT.endroit, a);
      const b = vqEl('button', 'vbPuce' + (a === AT.etat ? ' on' : '') + (a2 ? ' plein' : ''), t + (a2 ? ' ✓' : ''));
      b.type = 'button';
      b.setAttribute('data-etat', a);
      b.addEventListener('click', () => { AT.etat = a; AT.zone = ''; AT.place = ''; AT.ouvert = ''; atDessiner(); });
      ce.appendChild(b);
    });
    c.appendChild(ce);
  }else AT.etat = '';
  const nomVue = atNomEndroit(AT.endroit) + (AT.etat ? ' — ' + atNomAllumage(AT.etat) + ' allumés' : '');
  const p = atPhotoDe(v, AT.endroit, AT.etat);
  if(!p){
    const vide = vqEl('div', 'atVide');
    vide.appendChild(vqEl('div', '', '📷 Pas encore de photo « ' + nomVue + ' » pour ' + atVoitureNom(v) + '.'));
    if(AT.etat) vide.appendChild(vqEl('div', 'vbAide', 'Prends la voiture sous le même angle que la photo normale, feux allumés. Puis dessine 🎯 sur chaque feu allumé, avec le numéro des questions qui le contrôlent.'));
    const f = vqEl('input', ''); f.type = 'file'; f.accept = 'image/*'; f.style.display = 'none'; f.className = 'atFichier';
    const b = vqEl('button', 'btn btn-primary', '📷 Déposer la photo'); b.type = 'button';
    b.addEventListener('click', () => f.click());
    f.addEventListener('change', () => { if(f.files && f.files[0]) atDeposer(f.files[0], null, b); });
    vide.appendChild(b); vide.appendChild(f);
    /* la même photo qu'une autre voiture (même intérieur, même moteur) */
    const autres = atPhotos().filter(x => x.endroit === AT.endroit && (x.etat || '') === AT.etat);
    if(autres.length){
      vide.appendChild(vqEl('div', 'vbLab', 'Ou la même que :'));
      const l = vqEl('div', 'atEndroits');
      autres.forEach(x => {
        const bb = vqEl('button', 'vbPuce', '📷 ' + (x.voitures.map(atVoitureNom).join(', ') || 'sans voiture'));
        bb.type = 'button';
        bb.addEventListener('click', () => atBasculerVoiture(x, v, true, bb));
        l.appendChild(bb);
      });
      vide.appendChild(l);
    }
    c.appendChild(vide);
    return c;
  }
  /* la photo sert à… */
  const sert = vqEl('div', 'atSert');
  sert.appendChild(vqEl('b', '', '📷 Cette photo sert à :'));
  atReglages().voitures.forEach(x => {
    const on = p.voitures.indexOf(x.id) !== -1;
    const b = vqEl('button', 'vbPuce' + (on ? ' on' : ''), (on ? '✓ ' : '') + x.nom);
    b.type = 'button';
    b.setAttribute('data-sert', x.id);
    b.addEventListener('click', () => atBasculerVoiture(p, x.id, !on, b));
    sert.appendChild(b);
  });
  sert.appendChild(vqEl('div', 'vbAide', 'Même photo pour plusieurs voitures : les zones ne se dessinent qu’une fois. Une voiture n’a qu’une photo par endroit' + (AT_ENDROITS_ALLUMES.indexOf(AT.endroit) !== -1 ? ' et par feux allumés.' : '.')));
  c.appendChild(sert);
  /* l'éditeur : glisser pour dessiner une zone, toucher une zone pour la régler */
  /* 📋 v1268 — ce qu'on dessine maintenant */
  const enCours = atPlaceEnCours();
  if(enCours){
    const bd = vqEl('div', 'atBandeau');
    bd.appendChild(vqEl('span', '', '✏️ Dessine maintenant : ' + (enCours.el.ic || '') + ' ' + atNomPartie(enCours.el, enCours.k) +
      (enCours.el.questions.length ? ' → question' + (enCours.el.questions.length > 1 ? 's ' : ' ') + enCours.el.questions.join(' et ') : (enCours.el.sorte === 'passage' ? ' (passage)' : ' (commande)'))));
    const an = vqEl('button', 'btn btn-secondary atPlus', 'Annuler'); an.type = 'button';
    an.addEventListener('click', () => { AT.place = ''; atDessiner(); });
    bd.appendChild(an);
    c.appendChild(bd);
  }
  const ed = vqEl('div', 'atEd' + (enCours ? ' aDessiner' : ''));
  ed.style.aspectRatio = (p.l || 4) + ' / ' + (p.h || 3);
  const img = document.createElement('img'); img.src = atLien(p); img.alt = ''; img.draggable = false;
  ed.appendChild(img);
  p.zones.forEach(zz => {
    const d = vqEl('div', 'atZ' + (zz.sorte === 'passage' ? ' passage' : zz.sorte === 'commande' ? ' commande' : '') + (zz.id === AT.zone ? ' sel' : ''));
    d.setAttribute('data-z', zz.id);
    d.style.cssText = 'left:' + zz.x + '%;top:' + zz.y + '%;width:' + zz.w + '%;height:' + zz.h + '%';
    d.appendChild(vqEl('b', '', (zz.sorte === 'passage' ? '➡️ ' : zz.sorte === 'commande' ? '🔘 ' : '🎯 ') + (zz.nom || 'sans nom') + (zz.sorte !== 'passage' && zz.questions && zz.questions.length ? ' · ' + zz.questions.join(' · ') : '')));
    /* 📋 v1268 — la zone choisie se déplace (en la glissant) et s'agrandit (par son coin) */
    if(zz.id === AT.zone){ const h = vqEl('i', 'atPoig'); h.title = 'Agrandir'; d.appendChild(h); d.title = 'Glisse pour la déplacer ; tire le coin pour l’agrandir'; }
    ed.appendChild(d);
  });
  let debut = null, cadre = null, bouge = null;
  const pos = ev => { const r = ed.getBoundingClientRect(); return { x: Math.max(0, Math.min(100, (ev.clientX - r.left) * 100 / r.width)), y: Math.max(0, Math.min(100, (ev.clientY - r.top) * 100 / r.height)) }; };
  const arrondi = n => Math.round(n * 10) / 10;
  ed.addEventListener('pointerdown', ev => {
    const zz = ev.target.closest('.atZ');
    if(zz && zz.getAttribute('data-z') === AT.zone){
      const z0 = p.zones.find(x => x.id === AT.zone);
      if(z0){
        bouge = { d: zz, z: z0, depart: pos(ev), coin: !!ev.target.closest('.atPoig'), x: z0.x, y: z0.y, w: z0.w, h: z0.h, change: false };
        try{ ed.setPointerCapture(ev.pointerId); }catch(e){}
        ev.preventDefault();
        return;
      }
    }
    if(zz){ AT.zone = zz.getAttribute('data-z'); AT.place = ''; atDessiner(); return; }
    debut = pos(ev);
    cadre = vqEl('div', 'atZ nouv');
    ed.appendChild(cadre);
    try{ ed.setPointerCapture(ev.pointerId); }catch(e){}
    ev.preventDefault();
  });
  ed.addEventListener('pointermove', ev => {
    if(bouge){
      const q = pos(ev), dx = q.x - bouge.depart.x, dy = q.y - bouge.depart.y;
      if(Math.abs(dx) + Math.abs(dy) > 0.4) bouge.change = true;
      if(bouge.coin){ bouge.w = arrondi(Math.max(2, Math.min(100 - bouge.z.x, bouge.z.w + dx))); bouge.h = arrondi(Math.max(2, Math.min(100 - bouge.z.y, bouge.z.h + dy))); }
      else{ bouge.x = arrondi(Math.max(0, Math.min(100 - bouge.z.w, bouge.z.x + dx))); bouge.y = arrondi(Math.max(0, Math.min(100 - bouge.z.h, bouge.z.y + dy))); }
      bouge.d.style.left = bouge.x + '%'; bouge.d.style.top = bouge.y + '%'; bouge.d.style.width = bouge.w + '%'; bouge.d.style.height = bouge.h + '%';
      return;
    }
    if(!debut) return;
    const q = pos(ev);
    cadre.style.cssText = 'left:' + Math.min(debut.x, q.x) + '%;top:' + Math.min(debut.y, q.y) + '%;width:' + Math.abs(q.x - debut.x) + '%;height:' + Math.abs(q.y - debut.y) + '%';
  });
  ed.addEventListener('pointerup', ev => {
    if(bouge){
      const b0 = bouge; bouge = null;
      if(!b0.change) return;
      const zones = p.zones.map(x => x.id !== b0.z.id ? x : Object.assign({}, x, { x: b0.x, y: b0.y, w: b0.w, h: b0.h }));
      atAppel({ action: 'jeuPhotoPoser', id: p.id, endroit: p.endroit, etat: p.etat || '', nom: p.nom, voitures: p.voitures, zones: zones })
        .then(r => { if(r){ showToastVerifs(b0.coin ? '↘️ Zone agrandie' : '✋ Zone déplacée'); atRedessiner(); } });
      return;
    }
    if(!debut) return;
    const q = pos(ev), d0 = debut;
    debut = null;
    if(cadre) cadre.remove();
    const w = Math.abs(q.x - d0.x), h = Math.abs(q.y - d0.y);
    if(w < 2 || h < 2) return;
    const id = atNouvelId(p);
    /* 📋 v1268 — depuis la liste : nom, sorte, questions déjà là, enregistrée tout de suite */
    const pl = atPlaceEnCours();
    if(pl){
      const cle = pl.el.id + ':' + pl.k;
      const zone = { id: id, nom: atNomPartie(pl.el, pl.k), sorte: pl.el.sorte, questions: pl.el.sorte === 'passage' ? [] : pl.el.questions.slice(), el: cle,
                     x: arrondi(Math.min(d0.x, q.x)), y: arrondi(Math.min(d0.y, q.y)), w: arrondi(w), h: arrondi(h) };
      /* « ✏️ La redessiner » : l'ancienne zone de cette partie s'en va */
      const avant = atZoneDePartie(AT.voiture, pl.el, pl.k);
      const zones = p.zones.filter(x => !(avant && avant.photo === p && x.id === avant.zone.id)).concat([zone]);
      atAppel({ action: 'jeuPhotoPoser', id: p.id, endroit: p.endroit, etat: p.etat || '', nom: p.nom, voitures: p.voitures, zones: zones })
        .then(r => { if(r){ showToastVerifs('🎯 ' + atNomPartie(pl.el, pl.k) + ' : placé'); atApresPose(pl.el, pl.k); } });
      return;
    }
    p.zones.push({ id: id, nom: '', sorte: 'reponse', questions: [], x: Math.round(Math.min(d0.x, q.x) * 10) / 10, y: Math.round(Math.min(d0.y, q.y) * 10) / 10,
                   w: Math.round(w * 10) / 10, h: Math.round(h * 10) / 10 });
    AT.zone = id;
    atDessiner();
    const n = AT.racine.querySelector('.atZoneNom'); if(n) n.focus();
  });
  c.appendChild(ed);
  c.appendChild(vqEl('div', 'vbAide', 'Choisis à droite ce que tu places, puis glisse sur la photo. Une zone touchée se déplace en la glissant, et s’agrandit par son coin. Les élèves ne voient jamais les cadres.'));
  const bas = vqEl('div', 'atBtns');
  const f = vqEl('input', ''); f.type = 'file'; f.accept = 'image/*'; f.style.display = 'none';
  const bc = vqEl('button', 'btn btn-secondary', '🔄 Changer la photo'); bc.type = 'button';
  bc.addEventListener('click', () => f.click());
  f.addEventListener('change', () => { if(f.files && f.files[0]) atDeposer(f.files[0], p, bc); });
  const br = vqEl('button', 'btn btn-secondary', '🗑️ Retirer la photo'); br.type = 'button';
  br.addEventListener('click', async () => {
    if(!await confirmer('Retirer cette photo « ' + atNomEndroit(p.endroit) + ' » ? Elle sert à : ' + (p.voitures.map(atVoitureNom).join(', ') || 'aucune voiture') + '. Ses zones partent avec elle.', 'Retirer une photo', true)) return;
    atAppel({ action: 'jeuPhotoRetirer', id: p.id }, br).then(r => { if(r){ AT.zone = ''; atRedessiner(); } });
  });
  bas.appendChild(bc); bas.appendChild(br); bas.appendChild(f);
  c.appendChild(bas);
  return c;
}
/* Une photo déposée : réduite (1600 px au plus), en JPEG */
function atReduire(fichier){
  return new Promise((ok, ko) => {
    const u = URL.createObjectURL(fichier);
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, 1600 / Math.max(im.naturalWidth, im.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.max(1, Math.round(im.naturalWidth * k)); c.height = Math.max(1, Math.round(im.naturalHeight * k));
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(u);
      ok({ donnees: c.toDataURL('image/jpeg', 0.85), l: c.width, h: c.height });
    };
    im.onerror = () => { URL.revokeObjectURL(u); ko(new Error('Ce fichier n’est pas une image.')); };
    im.src = u;
  });
}
async function atDeposer(fichier, photo, bouton){
  let r;
  try{ r = await atReduire(fichier); }catch(e){ showToastVerifs('⚠️ ' + e.message); return; }
  const c = photo ? { action: 'jeuPhotoPoser', id: photo.id, endroit: photo.endroit, etat: photo.etat || '', nom: photo.nom, voitures: photo.voitures, zones: photo.zones, image: r.donnees, l: r.l, h: r.h }
                  : { action: 'jeuPhotoPoser', endroit: AT.endroit, etat: AT.etat, nom: '', voitures: [AT.voiture], zones: [], image: r.donnees, l: r.l, h: r.h };
  /* une voiture n'a qu'une photo par endroit */
  if(!photo){
    for(const x of atPhotos().filter(x => x.endroit === AT.endroit && (x.etat || '') === AT.etat && x.voitures.indexOf(AT.voiture) !== -1)){
      await atAppel({ action: 'jeuPhotoPoser', id: x.id, endroit: x.endroit, etat: x.etat || '', nom: x.nom, voitures: x.voitures.filter(v => v !== AT.voiture), zones: x.zones });
    }
  }
  const ok = await atAppel(c, bouton);
  if(ok){ showToastVerifs('📷 Photo enregistrée'); await atCheminsAutoPoser(); atRedessiner(); }
}
async function atBasculerVoiture(p, v, oui, bouton){
  if(oui){
    for(const x of atPhotos().filter(x => x !== p && x.endroit === p.endroit && (x.etat || '') === (p.etat || '') && x.voitures.indexOf(v) !== -1)){
      await atAppel({ action: 'jeuPhotoPoser', id: x.id, endroit: x.endroit, etat: x.etat || '', nom: x.nom, voitures: x.voitures.filter(y => y !== v), zones: x.zones });
    }
  }
  const voitures = oui ? p.voitures.concat([v]) : p.voitures.filter(y => y !== v);
  const r = await atAppel({ action: 'jeuPhotoPoser', id: p.id, endroit: p.endroit, etat: p.etat || '', nom: p.nom, voitures: voitures, zones: p.zones }, bouton);
  if(r){ await atCheminsAutoPoser(); atRedessiner(); }
}

/* ---------- 3 · La zone, le chemin, les règles ---------- */
function atColReglages(){
  const c = vqEl('div', 'atCol');
  const v = AT.voiture;
  if(!v) return c;
  const p = atPhotoDe(v, AT.endroit, AT.etat);
  const zz = p && p.zones.find(x => x.id === AT.zone);
  if(zz) c.appendChild(atPanneauZone(p, zz));
  /* 📋 v1268 — la liste « À placer » */
  c.appendChild(atPanneauListe(v));
  c.appendChild(atPanneauChemin(v));
  c.appendChild(atPanneauAllumer(v));
  c.appendChild(atPanneauRegles(v));
  return c;
}
function atPanneauZone(p, zz){
  const b = vqEl('div', 'atP');
  b.appendChild(vqEl('h4', '', '🎯 La zone'));
  b.appendChild(vqEl('div', 'vbLab', 'Son nom (dit à l’élève quand il la touche par erreur)'));
  const nom = vqEl('input', 'vbIn atZoneNom'); nom.type = 'text'; nom.value = zz.nom || ''; nom.placeholder = 'Ex : le bouchon du lave-glace, la porte, la bague des feux, la pédale de frein';
  b.appendChild(nom);
  b.appendChild(vqEl('div', 'vbLab', 'C’est'));
  let sorte = zz.sorte;
  const qs = vqEl('div', '');
  const ch = vqEl('div', 'vbChx');
  [['reponse', '🎯 La réponse à des questions'], ['passage', '➡️ Un passage (porte, manette, capot…)'], ['commande', '🔘 Une commande à actionner (bague, bouton, pédale…)']].forEach(([k, t]) => {
    const x = vqEl('button', 'vbPuce' + (sorte === k ? ' on' : ''), t); x.type = 'button';
    x.setAttribute('data-sorte', k);
    x.addEventListener('click', () => { sorte = k; ch.querySelectorAll('.vbPuce').forEach(y => y.classList.toggle('on', y === x)); qs.style.display = k !== 'passage' ? '' : 'none'; });
    ch.appendChild(x);
  });
  b.appendChild(ch);
  qs.appendChild(vqEl('div', 'vbLab', 'Les numéros des questions'));
  const num = vqEl('input', 'vbIn atZoneQ'); num.type = 'text'; num.placeholder = 'Ex : 2, 50'; num.value = (zz.questions || []).join(', ');
  qs.appendChild(num);
  const apercu = vqEl('div', 'vbAide', '');
  const lire = () => Array.from(new Set((num.value.match(/\d{1,3}/g) || []).map(Number).filter(n => n >= 1 && n <= 100)));
  const voir = () => { apercu.textContent = lire().map(n => { const q = verifsQuestion(n); return n + ' · ' + (q ? q.verif : '?'); }).join('\n'); apercu.style.whiteSpace = 'pre-line'; };
  num.addEventListener('input', voir); voir();
  qs.appendChild(apercu);
  qs.style.display = sorte !== 'passage' ? '' : 'none';
  b.appendChild(qs);
  const bt = vqEl('div', 'atBtns');
  const ok = vqEl('button', 'btn btn-primary', '💾 Enregistrer la zone'); ok.type = 'button';
  ok.addEventListener('click', () => {
    const zones = p.zones.map(x => x.id !== zz.id ? x : Object.assign({}, x, { nom: nom.value.trim(), sorte: sorte, questions: sorte !== 'passage' ? lire() : [] }));
    atAppel({ action: 'jeuPhotoPoser', id: p.id, endroit: p.endroit, etat: p.etat || '', nom: p.nom, voitures: p.voitures, zones: zones }, ok).then(r => { if(r){ showToastVerifs('🎯 Zone enregistrée'); atRedessiner(); } });
  });
  const ret = vqEl('button', 'btn btn-secondary', '🗑️ Retirer la zone'); ret.type = 'button';
  ret.addEventListener('click', () => {
    atAppel({ action: 'jeuPhotoPoser', id: p.id, endroit: p.endroit, etat: p.etat || '', nom: p.nom, voitures: p.voitures, zones: p.zones.filter(x => x.id !== zz.id) }, ret).then(r => { if(r){ AT.zone = ''; atRedessiner(); } });
  });
  bt.appendChild(ok); bt.appendChild(ret);
  b.appendChild(bt);
  if(!zz.nom && !(zz.questions || []).length) b.appendChild(vqEl('div', 'vbAide', 'Zone neuve : donne-lui un nom et dis ce qu’elle est, puis 💾. Tant qu’elle n’est pas enregistrée, elle n’existe pas.'));
  return b;
}
/* 🧭 Le chemin vers l'endroit affiché, pour cette voiture */
function atPanneauChemin(v){
  const b = vqEl('div', 'atP atChemin');
  const e = AT.endroit;
  b.appendChild(vqEl('h4', '', '🧭 Le chemin vers « ' + atNomEndroit(e) + ' » — ' + atVoitureNom(v)));
  if(e === 'volant'){
    b.appendChild(vqEl('div', 'vbAide', 'L’élève commence toujours au volant, comme à l’examen : pas de chemin pour y arriver. Choisis un autre endroit (Capot ouvert, Coffre…) pour régler son chemin.'));
    return b;
  }
  /* les passages possibles : ceux des photos de CETTE voiture */
  const passages = [];
  AT_ENDROITS.forEach(([en]) => {
    const p = atPhotoDe(v, en);
    if(p) p.zones.filter(z => z.sorte === 'passage').forEach(z => passages.push({ cle: p.id + ':' + z.id, t: atNomEndroit(en) + ' › ' + (z.nom || 'sans nom'), photo: p.id, zone: z.id }));
  });
  if(!passages.length){
    b.appendChild(vqEl('div', 'vbAide', 'Dessine d’abord les zones ➡️ « passage » sur les photos de cette voiture (la porte, la manette du capot, le capot…), puis mets-les ici dans l’ordre.'));
    return b;
  }
  if(!AT.cheminEdit || AT.cheminEdit.v !== v || AT.cheminEdit.e !== e){
    const c = (atReglages().chemins[v] || {})[e] || [];
    AT.cheminEdit = { v: v, e: e, l: c.map(s => s.photo + ':' + s.zone) };
    AT.cheminAussi = {};
  }
  const ed = AT.cheminEdit;
  b.appendChild(vqEl('div', 'vbAide', 'L’élève part du volant et touche ces endroits dans l’ordre ; ensuite il est sur la photo « ' + atNomEndroit(e) + ' », où il montre la réponse.'));
  const liste = vqEl('ol', 'atEtapes');
  ed.l.forEach((cle, i) => {
    const li = vqEl('li', '');
    const sel = vqEl('select', 'vbIn');
    passages.forEach(x => sel.appendChild(new Option(x.t, x.cle)));
    if(!passages.some(x => x.cle === cle)) sel.appendChild(new Option('⚠️ un passage qui n’existe plus', cle));
    sel.value = cle;
    sel.addEventListener('change', () => { ed.l[i] = sel.value; });
    li.appendChild(sel);
    const mini = (t, quoi, titre) => { const x = vqEl('button', 'atMini', t); x.type = 'button'; x.title = titre; x.setAttribute('aria-label', titre); x.addEventListener('click', quoi); li.appendChild(x); };
    mini('↑', () => { if(i){ const t = ed.l[i - 1]; ed.l[i - 1] = ed.l[i]; ed.l[i] = t; atDessiner(); } }, 'Monter');
    mini('↓', () => { if(i < ed.l.length - 1){ const t = ed.l[i + 1]; ed.l[i + 1] = ed.l[i]; ed.l[i] = t; atDessiner(); } }, 'Descendre');
    mini('✕', () => { ed.l.splice(i, 1); atDessiner(); }, 'Retirer l’étape');
    liste.appendChild(li);
  });
  b.appendChild(liste);
  const plus = vqEl('button', 'btn btn-secondary atPlus', '➕ Ajouter une étape'); plus.type = 'button';
  plus.addEventListener('click', () => { ed.l.push(passages[0].cle); atDessiner(); });
  b.appendChild(plus);
  b.appendChild(atAussi(v, AT.cheminAussi, 'Appliquer aussi à :'));
  const ok = vqEl('button', 'btn btn-primary', '💾 Enregistrer le chemin'); ok.type = 'button';
  ok.addEventListener('click', () => {
    const r = atCopieReglages();
    const etapes = ed.l.map(c => { const [ph, zo] = c.split(':'); return { photo: Number(ph), zone: zo }; });
    const cibles = [v].concat(Object.keys(AT.cheminAussi).filter(k => AT.cheminAussi[k]));
    const manque = [];
    cibles.forEach(x => {
      r.chemins[x] = r.chemins[x] || {};
      if(etapes.length) r.chemins[x][e] = etapes; else delete r.chemins[x][e];
      /* une étape sur une photo qui ne sert pas à cette voiture */
      etapes.forEach(s => { const p = atPhotos().find(y => y.id === s.photo); if(p && p.voitures.indexOf(x) === -1 && manque.indexOf(x) === -1) manque.push(x); });
    });
    atReglagesPoser(r, ok, '🧭 Chemin enregistré' + (cibles.length > 1 ? ' pour ' + cibles.length + ' voitures' : '')).then(res => {
      if(res && manque.length) showToastVerifs('⚠️ Attention : ' + manque.map(atVoitureNom).join(', ') + ' n’a pas ces photos — coche-la sous les photos, ou refais son chemin.');
      AT.cheminEdit = null;
      atRedessiner();
    });
  });
  b.appendChild(ok);
  return b;
}
/* 💡 v1255 — ALLUMER LES FEUX, POUR CETTE VOITURE : les commandes à
   toucher dans l'ordre, et combien de fois chacune (« la bague : 2
   crans », « le bouton, puis tirer le comodo »). */
function atPanneauAllumer(v){
  const b = vqEl('div', 'atP atAllumer');
  b.appendChild(vqEl('h4', '', '💡 Allumer les feux — ' + atVoitureNom(v)));
  const ch = vqEl('div', 'vbChx');
  AT_ALLUMAGES.forEach(([a, t]) => {
    const fait = ((atReglages().allumages[v] || {})[a] || []).length;
    const x = vqEl('button', 'vbPuce' + (a === AT.allumage ? ' on' : ''), t + (fait ? ' ✓' : ''));
    x.type = 'button'; x.setAttribute('data-allumage', a);
    x.addEventListener('click', () => { AT.allumage = a; AT.allumageEdit = null; AT.allumageAussi = {}; atDessiner(); });
    ch.appendChild(x);
  });
  b.appendChild(ch);
  const a = AT.allumage;
  /* les commandes possibles : les zones 🔘 des photos de cette voiture */
  const commandes = [];
  atPhotos().forEach(p => {
    if(p.voitures.indexOf(v) === -1 || atPhotoDe(v, p.endroit, p.etat || '') !== p) return;
    p.zones.filter(z => z.sorte === 'commande').forEach(z => commandes.push({ cle: p.id + ':' + z.id, t: atNomEndroit(p.endroit) + (p.etat ? ' (' + atNomAllumage(p.etat) + ')' : '') + ' › ' + (z.nom || 'sans nom') }));
  });
  if(!commandes.length){
    b.appendChild(vqEl('div', 'vbAide', 'Dessine d’abord, sur la photo « Au volant » de cette voiture, les zones 🔘 « commande » : la bague des feux, le bouton des feux de détresse, le comodo, la pédale de frein, le levier de vitesse…'));
    return b;
  }
  if(!AT.allumageEdit || AT.allumageEdit.v !== v || AT.allumageEdit.a !== a){
    const c = (atReglages().allumages[v] || {})[a] || [];
    AT.allumageEdit = { v: v, a: a, l: c.map(s2 => ({ cle: s2.photo + ':' + s2.zone, fois: s2.fois || 1 })) };
  }
  const ed = AT.allumageEdit;
  b.appendChild(vqEl('div', 'vbAide', 'L’élève, au volant, touche ces commandes dans l’ordre, le bon nombre de fois, puis dit « C’est allumé ». Un appui de trop, une commande de plus ou en moins : c’est une erreur, et la question part dans « À revoir ».'));
  const liste = vqEl('ol', 'atEtapes');
  ed.l.forEach((x, i) => {
    const li = vqEl('li', '');
    const sel = vqEl('select', 'vbIn');
    sel.setAttribute('aria-label', 'Commande de l’étape ' + (i + 1));
    commandes.forEach(y => sel.appendChild(new Option(y.t, y.cle)));
    if(!commandes.some(y => y.cle === x.cle)) sel.appendChild(new Option('⚠️ une commande qui n’existe plus', x.cle));
    sel.value = x.cle;
    sel.addEventListener('change', () => { x.cle = sel.value; });
    li.appendChild(sel);
    const fois = vqEl('select', 'vbIn atFois');
    fois.setAttribute('aria-label', 'Nombre d’appuis à l’étape ' + (i + 1));
    for(let k = 1; k <= 6; k++) fois.appendChild(new Option('× ' + k + (k === 1 ? ' appui' : ' appuis'), String(k)));
    fois.value = String(x.fois || 1);
    fois.addEventListener('change', () => { x.fois = Number(fois.value) || 1; });
    li.appendChild(fois);
    const mini = (t, quoi, titre) => { const y = vqEl('button', 'atMini', t); y.type = 'button'; y.title = titre; y.setAttribute('aria-label', titre); y.addEventListener('click', quoi); li.appendChild(y); };
    mini('↑', () => { if(i){ const t = ed.l[i - 1]; ed.l[i - 1] = ed.l[i]; ed.l[i] = t; atDessiner(); } }, 'Monter');
    mini('↓', () => { if(i < ed.l.length - 1){ const t = ed.l[i + 1]; ed.l[i + 1] = ed.l[i]; ed.l[i] = t; atDessiner(); } }, 'Descendre');
    mini('✕', () => { ed.l.splice(i, 1); atDessiner(); }, 'Retirer l’étape');
    liste.appendChild(li);
  });
  b.appendChild(liste);
  const plus = vqEl('button', 'btn btn-secondary atPlus', '➕ Ajouter une commande'); plus.type = 'button';
  plus.addEventListener('click', () => { ed.l.push({ cle: commandes[0].cle, fois: 1 }); atDessiner(); });
  b.appendChild(plus);
  /* les photos « allumées » de cette voiture */
  const vues = AT_ENDROITS_ALLUMES.filter(e => atPhotoDe(v, e, a)).map(atNomEndroit);
  b.appendChild(vqEl('div', 'vbAide', vues.length ? '📷 Photos avec ' + atNomAllumage(a).replace(/^\S+\s/, '').toLowerCase() + ' allumés : ' + vues.join(', ') + '.'
                                                   : '📷 Pas encore de photo avec ces feux allumés : dépose-la à gauche (endroit, puis « 💡 Les feux sur cette photo »).'));
  b.appendChild(atAussi(v, AT.allumageAussi, 'Appliquer aussi à :'));
  const ok = vqEl('button', 'btn btn-primary', '💾 Enregistrer'); ok.type = 'button';
  ok.addEventListener('click', () => {
    const rr = atCopieReglages();
    rr.allumages = rr.allumages || {};
    const etapes = ed.l.map(x => { const [ph, zo] = x.cle.split(':'); return { photo: Number(ph), zone: zo, fois: x.fois || 1 }; });
    const cibles = [v].concat(Object.keys(AT.allumageAussi).filter(k => AT.allumageAussi[k]));
    cibles.forEach(x => {
      rr.allumages[x] = rr.allumages[x] || {};
      if(etapes.length) rr.allumages[x][a] = etapes; else delete rr.allumages[x][a];
    });
    atReglagesPoser(rr, ok, atNomAllumage(a) + ' : réglé' + (cibles.length > 1 ? ' pour ' + cibles.length + ' voitures' : '')).then(() => { AT.allumageEdit = null; atRedessiner(); });
  });
  b.appendChild(ok);
  return b;
}

/* « Appliquer aussi à » / « Même chose pour » : les autres voitures, en un clic */
function atAussi(v, etat, titre){
  const d = vqEl('div', 'atAussi');
  d.appendChild(vqEl('div', 'vbLab', titre));
  const l = vqEl('div', 'vbChx');
  const autres = atReglages().voitures.filter(x => x.id !== v);
  if(!autres.length){ l.appendChild(vqEl('span', 'vbAide', 'pas d’autre voiture')); }
  autres.forEach(x => {
    const b = vqEl('button', 'vbPuce' + (etat[x.id] ? ' on' : ''), (etat[x.id] ? '✓ ' : '') + x.nom); b.type = 'button';
    b.setAttribute('data-aussi', x.id);
    b.addEventListener('click', () => { etat[x.id] = !etat[x.id]; b.classList.toggle('on', !!etat[x.id]); b.textContent = (etat[x.id] ? '✓ ' : '') + x.nom; });
    l.appendChild(b);
  });
  if(autres.length > 1){
    const t = vqEl('button', 'vbPuce', 'Toutes'); t.type = 'button';
    t.addEventListener('click', () => { autres.forEach(x => { etat[x.id] = true; }); atDessiner(); });
    l.appendChild(t);
  }
  d.appendChild(l);
  return d;
}
/* 🔧 Les règles : ce que l'élève doit faire, question par question */
function atPanneauRegles(v){
  const b = vqEl('div', 'atP atRegles');
  b.appendChild(vqEl('h4', '', '🔧 Question par question — ' + atVoitureNom(v)));
  /* la grille : 📍 placée sur une photo · 🗣️ à dire · 🖥️ ordinateur de bord */
  const g = vqEl('div', 'vqJeuGrille atGrilleQ');
  for(let n = 1; n <= 100; n++){
    const r = atRegle(v, n), z = atZoneReponse(v, n);
    const x = vqEl('button', r ? (r.mode === 'ordi' ? 'o' : r.mode === 'allumer' ? 'a' : 'd') : (z ? 'm' : ''), String(n)); x.type = 'button';
    x.title = n + ' · ' + (r ? (r.mode === 'ordi' ? '🖥️ ordinateur de bord' : r.mode === 'allumer' ? '💡 ' + atNomAllumage(r.allumage) + ', puis contrôler' : '🗣️ à dire') : (z ? '📍 ' + atNomEndroit(z.photo.endroit) + ' › ' + (z.zone.nom || '') : 'en questions-réponses'));
    if(n === AT.regleN) x.classList.add('sel');
    x.addEventListener('click', () => { AT.regleN = n; AT.regleAussi = {}; atDessiner(); });
    g.appendChild(x);
  }
  b.appendChild(g);
  b.appendChild(vqEl('div', 'vbAide', 'Vert : sur une photo · jaune : 💡 allumer puis contrôler · bleu : à dire · violet : ordinateur de bord · gris : en questions-réponses. Touche un numéro pour le régler.'));
  const n = AT.regleN;
  if(!n) return b;
  const q = verifsQuestion(n);
  b.appendChild(vqEl('div', 'atQ', n + ' · ' + (q ? q.verif : '')));
  const r = atRegle(v, n) || {};
  const z = atZoneReponse(v, n);
  let mode = r.mode || 'zone';
  let allumage = r.allumage || atAllumageDeQuestion(n) || 'croisement';
  const ch = vqEl('div', 'vbChx');
  const txt = vqEl('div', '');
  const feux = vqEl('div', '');
  const montrer = () => { txt.style.display = (mode === 'dire' || mode === 'ordi') ? '' : 'none'; info.style.display = mode === 'zone' ? '' : 'none'; feux.style.display = mode === 'allumer' ? '' : 'none'; };
  [['zone', '📍 La montrer sur la photo'], ['allumer', '💡 L’allumer, puis contrôler'], ['dire', '🗣️ Il n’y en a pas : à dire'], ['ordi', '🖥️ C’est l’ordinateur de bord']].forEach(([k, t]) => {
    const x = vqEl('button', 'vbPuce' + (mode === k ? ' on' : ''), t); x.type = 'button';
    x.setAttribute('data-mode', k);
    x.addEventListener('click', () => { mode = k; ch.querySelectorAll('.vbPuce').forEach(y => y.classList.toggle('on', y === x)); montrer(); });
    ch.appendChild(x);
  });
  b.appendChild(ch);
  /* 💡 quels feux, et où en est cette voiture */
  feux.appendChild(vqEl('div', 'vbLab', 'Les feux à allumer'));
  const cf = vqEl('div', 'vbChx');
  const etatFeux = vqEl('div', 'vbAide', '');
  const direEtat = () => {
    const et = ((atReglages().allumages[v] || {})[allumage] || []);
    const cz = atZonesControle(v, n, allumage);
    etatFeux.style.whiteSpace = 'pre-line';
    etatFeux.textContent = (et.length ? '✅ Pour les allumer : ' + et.length + ' commande' + (et.length > 1 ? 's' : '') + ' (' + et.map(s2 => '×' + s2.fois).join(', ') + ').' : '⚠️ Pas encore réglé : 💡 « Allumer les feux », plus haut.') + '\n' +
      (cz.length ? '✅ Pour contrôler : ' + cz.map(x => atNomEndroit(x.photo.endroit) + ' › ' + (x.zone.nom || 'zone')).join(' · ') + '.' : '⚠️ Pas encore de feu à toucher : sur la photo avec ces feux allumés, dessine 🎯 sur le feu, avec le n° ' + n + '.');
  };
  AT_ALLUMAGES.forEach(([a, t]) => {
    const x = vqEl('button', 'vbPuce' + (allumage === a ? ' on' : ''), t); x.type = 'button';
    x.setAttribute('data-feux', a);
    x.addEventListener('click', () => { allumage = a; cf.querySelectorAll('.vbPuce').forEach(y => y.classList.toggle('on', y === x)); direEtat(); });
    cf.appendChild(x);
  });
  feux.appendChild(cf); feux.appendChild(etatFeux); direEtat();
  b.appendChild(feux);
  const info = vqEl('div', 'vbAide', z ? '📍 Placée : ' + atNomEndroit(z.photo.endroit) + ' › ' + (z.zone.nom || 'zone sans nom') + '.' : 'Pas encore de zone pour elle : dessine-la sur la bonne photo (🎯, avec son numéro). Sans zone, elle se joue en questions-réponses.');
  b.appendChild(info);
  txt.appendChild(vqEl('div', 'vbLab', 'Ce qu’il doit dire (montré quand il a trouvé)'));
  const dire = vqEl('textarea', 'vbIn atDire'); dire.rows = 2; dire.value = r.dire || ''; dire.placeholder = 'Ex : Il n’y a pas de commande : c’est automatique.';
  txt.appendChild(dire);
  txt.appendChild(vqEl('div', 'vbLab', 'Ailleurs, en général'));
  const gen = vqEl('textarea', 'vbIn atGeneral'); gen.rows = 2; gen.value = r.general != null ? r.general : ((q && q.verifRep) || '');
  txt.appendChild(gen);
  b.appendChild(txt);
  montrer();
  b.appendChild(atAussi(v, AT.regleAussi, 'Même chose pour :'));
  const ok = vqEl('button', 'btn btn-primary', '💾 Enregistrer'); ok.type = 'button';
  ok.addEventListener('click', () => {
    const rr = atCopieReglages();
    const cibles = [v].concat(Object.keys(AT.regleAussi).filter(k => AT.regleAussi[k]));
    cibles.forEach(x => {
      rr.regles[x] = rr.regles[x] || {};
      if(mode === 'zone') delete rr.regles[x][String(n)];
      else if(mode === 'allumer') rr.regles[x][String(n)] = { mode: 'allumer', allumage: allumage };
      else rr.regles[x][String(n)] = { mode: mode, dire: dire.value.trim(), general: gen.value.trim() };
    });
    atReglagesPoser(rr, ok, '🔧 Question ' + n + ' réglée' + (cibles.length > 1 ? ' pour ' + cibles.length + ' voitures' : ''));
  });
  b.appendChild(ok);
  return b;
}

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-jeu-atelier.js'] = true;
