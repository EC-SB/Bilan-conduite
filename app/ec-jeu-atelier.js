/* Déployé le 13/11/2026 à 10:57 — v1421 */
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
/* 🧰 v1420 — les voitures de la V2 (voir ROLES_VOITURE_JEU côté Worker) */
const AT_ROLES_V2 = [['', '— rien dans la V2 —'], ['bv-sb', 'BV · Saint-Brieuc'], ['bea-sb', 'BEA · Saint-Brieuc (les Q3 habituels)'],
  ['bea-sb-10', 'BEA · le Q3 n°10'], ['bv-ld', 'BV · Loudéac'], ['bea-ld', 'BEA · Loudéac']];
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
    if(r.jeu){ AT.jeu = r.jeu; if(typeof VERIFS !== 'undefined') VERIFS.jeu = r.jeu; }
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
  /* 🧰 v1421 — quatre vues : les photos (comme avant), et ce qui sert au nouveau jeu */
  z.appendChild(atSousOnglets());
  if(AT.vue === 'etapes') return atVueEtapes(z);
  if(AT.vue === 'mots') return atVueMots(z);
  if(AT.vue === 'pret') return atVuePret(z);
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
    const rv2 = (AT_ROLES_V2.find(x => x[0] === (v.role || '')) || ['', ''])[1];
    b.appendChild(vqEl('small', '', (v.boite ? v.boite + ' · ' : '') + n + ' question(s) placée(s) · ' + AT_ENDROITS.filter(e => atPhotoDe(v.id, e[0])).length + ' photo(s)' +
      (v.role ? ' · V2 : ' + rv2 : '')));
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
    /* 🧰 v1420 — À QUOI ELLE SERT DANS LA V2. David, le 13 novembre : la
       voiture de l'élève est « réglée sur BV ou BEA », « il faut qu'il
       puisse dire s'il a le Q3 10 s'il est en BEA, et à Loudéac la voiture
       de Loudéac » (une BV et une BEA, des Audi bien plus récentes). On le
       dit ici, voiture par voiture : le jeu prend la première qui sert. */
    c.appendChild(vqEl('div', 'vbLab', '🧰 Dans le nouveau jeu (V2), « ' + v.nom + ' » sert à'));
    const role = vqEl('select', 'vbIn');
    role.setAttribute('data-role-voiture', v.id);
    AT_ROLES_V2.forEach(([k, t]) => role.appendChild(new Option(t, k)));
    role.value = v.role || '';
    role.addEventListener('change', () => {
      const r = atCopieReglages();
      const w = r.voitures.find(x => x.id === v.id);
      if(!w) return;
      w.role = role.value;
      atReglagesPoser(r, null, role.value ? '🧰 ' + v.nom + ' : ' + role.options[role.selectedIndex].text : '🧰 ' + v.nom + ' : rien dans la V2');
    });
    c.appendChild(role);
    /* ⬇️ v1421 — toutes ses photos, dans un .zip */
    const nbPh = atPhotos().filter(p => p.voitures.indexOf(v.id) !== -1).length;
    if(nbPh){
      const dl = vqEl('button', 'btn btn-secondary atDl', '⬇️ Toutes ses photos (' + nbPh + ', .zip)'); dl.type = 'button';
      dl.addEventListener('click', () => atTelechargerVoiture(v.id, dl));
      c.appendChild(dl);
    }
    const ret = vqEl('button', 'atLien', '🗑️ Retirer « ' + v.nom + ' » du jeu'); ret.type = 'button';
    ret.addEventListener('click', async () => {
      if(!await confirmer('Retirer « ' + v.nom + ' » du jeu ? Ses chemins et ses règles partent avec elle ; les photos restent pour les autres voitures.', 'Retirer une voiture', true)) return;
      const r = atCopieReglages();
      r.voitures = r.voitures.filter(x => x.id !== v.id);
      delete r.chemins[v.id]; delete r.regles[v.id];
      if(r.etapes) delete r.etapes[v.id];
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
  /* ⬇️ v1421 — la télécharger */
  const bd = vqEl('button', 'btn btn-secondary', '⬇️ Télécharger'); bd.type = 'button';
  bd.addEventListener('click', () => atTelechargerPhoto(p, bd));
  bas.appendChild(bc); bas.appendChild(bd); bas.appendChild(br); bas.appendChild(f);
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

/* ============================================================
   🗣️ v1421 — LES MOTS ATTENDUS : COPIE de eleve.html (jwNorm,
   jwThemeGeste, jwChiffres … jwSurligner), renommée atJw… Les deux
   restent pareilles : le test leur fait vérifier les mêmes réponses.
   ============================================================ */
function atJwNorm(t){
  return String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[’'`]/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
}
function atJwThemeGeste(q, type){
  var t = atJwNorm(q);
  if(/voyant|temoin/.test(t)) return 'voyants';
  if(/capot|moteur|huile|lave glace|liquide|batterie|refroidissement/.test(t)) return 'capot';
  if(/\bfeux?\b|clignot|eclair|phare|brouillard|detresse/.test(t)) return 'feux';
  return type === 'VE' ? 'autour' : 'volant';
}
var AT_JW_VIDES = {};
('les des une dans sur sous par pour pas plus moins tres tout tous toute toutes mais donc car comme avec sans leur leurs lui meme aussi bien ' +
 'faire fait faut peut doit afin lors etre avoir sont etait cela cette ceci celui celle ceux elles ils nous vous votre notre quand ou est ont ' +
 'son ses sur entre vers chez autre autres tres afin encore deja jamais toujours alors ainsi cest dun dune quil quelle quon ' +
 'tel tels telle telles grace avant apres ceci votre vos cette celle doivent devez pouvez peuvent permet permettre').split(' ')
  .forEach(function(w){ AT_JW_VIDES[w] = 1; });
var AT_JW_NOMBRES = { zero: 0, deux: 2, trois: 3, quatre: 4, cinq: 5, six: 6, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11, douze: 12, treize: 13,
                   quatorze: 14, quinze: 15, seize: 16, vingt: 20, vingts: 20, trente: 30, quarante: 40, cinquante: 50, soixante: 60,
                   cent: 100, cents: 100, mille: 1000 };
/* « cent cinquante » → « 150 », « quarante-cinq » → « 45 », « deux » → « 2 »
   (pas « un » tout seul : c'est aussi un article) */
function atJwChiffres(t){
  var m = atJwNorm(t).split(' '), out = [], k = 0;
  while(k < m.length){
    if(AT_JW_NOMBRES[m[k]] === undefined){ out.push(m[k]); k++; continue; }
    var total = 0, cur = 0;
    while(k < m.length){
      var w = m[k], v = AT_JW_NOMBRES[w];
      if(v === undefined){
        /* « vingt et un », « quarante et un » : le « et un » du milieu */
        if(w === 'et' && m[k + 1] === 'un' && cur >= 20){ cur += 1; k += 2; continue; }
        if(w === 'un' && cur >= 20 && cur % 10 === 0){ cur += 1; k++; continue; }
        break;
      }
      if(v === 100) cur = (cur || 1) * 100;
      else if(v === 1000){ total += (cur || 1) * 1000; cur = 0; }
      else if(v === 20 && cur > 1 && cur < 10) cur = cur * 20;
      else cur += v;
      k++;
    }
    out.push(String(total + cur));
  }
  return out.join(' ');
}
function atJwRacineMot(w){ return /^\d+$/.test(w) ? w : (w.length <= 4 ? w : w.slice(0, Math.min(6, Math.max(4, w.length - 1)))); }
function atJwMotsDe(t){
  return atJwChiffres(t).split(' ').filter(function(w){ return w && (/^\d+$/.test(w) || (w.length >= 4 && !AT_JW_VIDES[w])); });
}
/* Les mots attendus d'une réponse : les mots qui comptent, sans doublon */
function atJwMotsAttendus(rep){
  var vus = {}, out = [], vrai = {};
  /* le mot tel qu'il est écrit (accents compris), pour le lui montrer */
  String(rep || '').split(/[\s’'`\-\/,.;:!?()«»"]+/).forEach(function(t){ var k = atJwNorm(t); if(k && !vrai[k]) vrai[k] = t; });
  atJwMotsDe(rep).forEach(function(w){
    var r = atJwRacineMot(w);
    if(vus[r]) return;
    vus[r] = 1;
    out.push({ mot: vrai[w] || w, racine: r });
  });
  return out.slice(0, 14);
}
/* 🧰 v1421 — LES MOTS ATTENDUS, RÉGLÉS PAR DAVID DANS L'ATELIER
   (🗣️ Les mots de « Je dis ») : un mot ou une expression par ligne — une
   expression compte quand tous ses mots y sont — et combien il en faut.
   Sans réglage : les mots tirés de la réponse de la banque.
   ⚠️ COPIE dans app/ec-jeu-atelier.js (atJw…) : le test les compare. */
function atJwAttendus(perso, rep){
  if(perso && Array.isArray(perso.m) && perso.m.length){
    var l = [];
    perso.m.forEach(function(e){
      var r = atJwMotsDe(e).map(atJwRacineMot);
      if(r.length) l.push({ mot: String(e), racines: r });
    });
    if(l.length) return { liste: l, besoin: Math.max(0, Math.min(l.length, Number(perso.b) || 0)) };
  }
  return { liste: atJwMotsAttendus(rep).map(function(x){ return { mot: x.mot, racines: [x.racine] }; }), besoin: 0 };
}
function atJwMemeMot(a, b){
  if(a === b) return true;
  if(/^\d+$/.test(a) || /^\d+$/.test(b)) return false;
  return a.length >= 4 && b.length >= 4 && (a.indexOf(b) === 0 || b.indexOf(a) === 0);
}
function atJwVerifier(rep, dit, perso){
  var a = atJwAttendus(perso, rep), att = a.liste;
  var lus = atJwMotsDe(dit).map(atJwRacineMot);
  var trouves = att.filter(function(x){ return x.racines.every(function(r0){ return lus.some(function(r){ return atJwMemeMot(r0, r); }); }); });
  var k = att.length;
  var besoin = a.besoin || (k <= 2 ? k : Math.min(5, Math.ceil(k * 0.5)));
  return { ok: k > 0 && trouves.length >= besoin, trouves: trouves, manquants: att.filter(function(x){ return trouves.indexOf(x) === -1; }),
           besoin: besoin, total: k };
}
/* La réponse attendue, avec les mots qu'il a dits en vert */
function atJwSurligner(rep, trouves){
  var r = [];
  trouves.forEach(function(x){ (x.racines || [x.racine]).forEach(function(y){ r.push(y); }); });
  return String(rep || '').split(/(\s+)/).map(function(m){
    var w = atJwNorm(m).split(' ')[0] || '';
    var ok = w && r.some(function(x){ return atJwMemeMot(x, atJwRacineMot(w)); });
    return ok ? '<mark>' + echapper(m) + '</mark>' : echapper(m);
  }).join('');
}


/* ============================================================
   🧰 v1421 — LE NOUVEAU JEU (V2), LIVRAISON 2 : CE QUI SE RÈGLE ICI

   David, le 13 novembre (ses réponses à la proposition V2) :
     · « Je fais » : l'élève fait le geste ÉTAPE PAR ÉTAPE, dans l'ordre —
       les étapes viennent de ses photos (le chemin de l'endroit, puis ce
       qu'il montre) ; ici, il les voit geste par geste et corrige celles
       qui ne vont pas (une étape en plus, une autre dans l'ordre), voiture
       par voiture, « pareil sur » les autres ;
     · les appuis : l'élève VOIT ce qui s'allume à chaque appui (d'après
       💡 Allumer les feux) ; ici, ce que chaque appui allume ;
     · « Je dis » : il le dit, c'est écrit, et c'est vérifié par les mots
       attendus, sans IA — ici, il relit et corrige ces mots ;
     · 📋 ce qui est prêt, voiture par voiture, et ce qui manque ;
     · ⬇️ télécharger ses photos (« je ne peux pas les récupérer depuis
       l'appli »).
   ============================================================ */
const AT_VUES = [['photos', '📸 Photos et zones'], ['etapes', '🧩 Les étapes des gestes'], ['mots', '🗣️ Les mots de « Je dis »'], ['pret', '📋 Ce qui est prêt']];
const AT_JW_THEMES = [['capot', '🔧 Sous le capot'], ['feux', '💡 Les feux'], ['voyants', '🚨 Les voyants'], ['volant', '🎛️ Au volant'], ['autour', '🚗 Autour de la voiture']];
/* l'ordre où l'élève cherche les parties d'une réponse (le même que jvZonesReponse dans eleve.html) */
const AT_ORDRE_PARTIES = ['volant', 'voyants', 'porte', 'passager', 'portiere', 'sieges', 'capot', 'devant', 'cote', 'arriere', 'coffre', 'roue'];
/* les endroits où l'élève est déjà : pas d'étape à faire pour y arriver */
const AT_SANS_CHEMIN = ['volant', 'voyants'];

function atSousOnglets(){
  const o = vqEl('div', 'atOng atVues');
  AT_VUES.forEach(([k, t]) => {
    const b = vqEl('button', 'vbPuce' + ((AT.vue || 'photos') === k ? ' on' : ''), t);
    b.type = 'button';
    b.setAttribute('data-at-vue', k);
    b.setAttribute('aria-pressed', (AT.vue || 'photos') === k ? 'true' : 'false');
    b.addEventListener('click', () => { AT.vue = k; atDessiner(); try{ AT.racine.scrollIntoView({ block: 'start' }); }catch(e){} });
    o.appendChild(b);
  });
  return o;
}

/* ---------- Les cartes de la V2, comme les tire eleve.html (jwCatalogue) ---------- */
function atJwCatalogue(){
  const cartes = {}, liste = [], cles = {};
  const champs = { v: 'verif', q: 'qser', s: 'secours' };
  for(let n = 1; n <= 100; n++){
    const x = verifsQuestion(n);
    if(!x) continue;
    ['v', 'q', 's'].forEach(k => {
      const d = verifsPartieDemandee(n, champs[k]);
      if(!d || !d.q) return;
      const cle = k + '|' + atJwNorm(d.q);
      let id = cles[cle];
      if(!id){
        id = k + n;
        cles[cle] = id;
        cartes[id] = { id: id, k: k, n: n, ns: [], q: d.q, r: d.r || '', type: x.type,
                       m: k === 'v' ? (d.neutre ? (d.depuis || 0) : n) : 0,
                       theme: k === 'q' ? 'qser' : (k === 's' ? 'secours' : atJwThemeGeste(d.q, x.type)) };
        liste.push(id);
      }
      cartes[id].ns.push(n);
    });
  }
  return { cartes: cartes, liste: liste };
}

/* ---------- Les étapes d'un geste sur une voiture (comme jwEtapesGeste) ---------- */
function atResoudre(l){
  return (l || []).map(s => {
    const p = atPhotos().find(x => x.id === s.photo);
    const z = p && p.zones.find(x => x.id === s.zone);
    return (p && z) ? { photo: p, zone: z } : null;
  }).filter(Boolean);
}
function atPartsReponse(v, m){
  const l = [];
  AT_ORDRE_PARTIES.forEach(e => {
    const p = atPhotoDe(v, e);
    if(!p) return;
    p.zones.forEach(z => { if(z.sorte !== 'passage' && (z.questions || []).indexOf(m) !== -1) l.push({ photo: p, zone: z }); });
  });
  return l;
}
function atEtapesPropres(v, m){ const o = ((atReglages().etapes || {})[v] || {})[String(m)]; return Array.isArray(o) ? o : null; }
function atAllumageResolu(v, a){
  return (((atReglages().allumages || {})[v] || {})[a] || []).map(s => {
    const p = atPhotos().find(x => x.id === s.photo);
    const z = p && p.zones.find(x => x.id === s.zone);
    return (p && z) ? { photo: p, zone: z, fois: s.fois || 1 } : null;
  }).filter(Boolean);
}
/* L'état d'un geste : ce que l'élève fera, et ce qui manque.
   statut : 'pret' · 'verifier' (il se joue, mais quelque chose cloche) · 'faire' (en questions-réponses) */
function atEtatGeste(v, card){
  const m = card.m;
  const out = { mode: 'rien', etapes: [], fin: [], soucis: [], statut: 'faire', endroit: '', propre: false };
  if(!m){ out.soucis.push('Neutralisée et remplacée par un texte : elle se joue en questions-réponses.'); return out; }
  const rg = atRegle(v, m);
  if(rg && rg.mode === 'allumer'){
    out.mode = 'allumer';
    const st = atAllumageResolu(v, rg.allumage);
    st.forEach(s => out.etapes.push({ nom: (s.zone.nom || 'La commande') + (s.fois > 1 ? ' × ' + s.fois : ''), ic: '🔘' }));
    const cz = atZonesControle(v, m, rg.allumage);
    out.fin = cz.map(x => ({ nom: x.zone.nom || 'le feu', ic: '👀' }));
    if(!st.length) out.soucis.push('💡 ' + atNomAllumage(rg.allumage) + ' : pas encore réglé (📸 › 💡 Allumer les feux).');
    if(!cz.length) out.soucis.push('Pas encore de feu à toucher : sur la photo avec ces feux allumés, dessine 🎯 sur le feu (n° ' + m + ').');
    out.statut = !st.length ? 'faire' : (cz.length ? 'pret' : 'verifier');
    out.allumage = rg.allumage;
    return out;
  }
  if(rg){
    out.mode = rg.mode;
    out.fin = [{ nom: rg.mode === 'ordi' ? 'Je dis : c’est l’ordinateur de bord' : 'Je dis : il n’y en a pas', ic: '🗣️' }];
    out.statut = 'pret';
    return out;
  }
  const parts = atPartsReponse(v, m);
  if(!parts.length){ out.soucis.push('Rien de placé sur cette voiture : dessine la réponse (🎯 n° ' + m + ') sur la bonne photo.'); return out; }
  out.mode = 'zone';
  out.endroit = parts[0].photo.endroit;
  const propre = atEtapesPropres(v, m);
  out.propre = !!propre;
  const avant = propre ? atResoudre(propre) : atResoudre(((atReglages().chemins[v] || {})[out.endroit]) || []);
  avant.forEach(s => out.etapes.push({ nom: s.zone.nom || 'Passage', ic: s.zone.sorte === 'commande' ? '🔘' : '➡️', endroit: s.photo.endroit }));
  out.fin = parts.map(x => ({ nom: x.zone.nom || 'la réponse', ic: '🎯', endroit: x.photo.endroit }));
  out.statut = 'pret';
  if(propre && avant.length < propre.length){ out.soucis.push('Une étape réglée ici n’existe plus (zone ou photo retirée) : revois ses étapes.'); out.statut = 'verifier'; }
  if(!avant.length && !propre && AT_SANS_CHEMIN.indexOf(out.endroit) === -1){
    out.soucis.push('Aucune étape avant : l’élève arrive directement sur « ' + atNomEndroit(out.endroit) + ' ». Règle le chemin (📸 › 🧭) ou les étapes de ce geste.');
    out.statut = 'verifier';
  }
  return out;
}
function atChipsEtapes(e){
  const ol = vqEl('ol', 'atChips');
  e.etapes.forEach(x => ol.appendChild(vqEl('li', '', x.ic + ' ' + x.nom)));
  e.fin.forEach(x => { const li = vqEl('li', 'fin', x.ic + ' ' + x.nom); ol.appendChild(li); });
  if(!e.etapes.length && !e.fin.length) ol.appendChild(vqEl('li', 'vide', '🃏 en questions-réponses (carte retournée)'));
  return ol;
}
const AT_STATUTS = { pret: ['✅', 'Prêt'], verifier: ['⚠️', 'À vérifier'], faire: ['✏️', 'À faire'] };
function atNomCourt(q){ const t = String(q || '').replace(/\s+/g, ' ').trim(); return t.length > 110 ? t.slice(0, 108) + '…' : t; }

/* ---------- Choisir la voiture (les trois vues) ---------- */
function atPucesVoitures(apres){
  const d = vqEl('div', 'atEndroits atVoitPuces');
  atReglages().voitures.forEach(v => {
    const role = (AT_ROLES_V2.find(x => x[0] === (v.role || '')) || ['', ''])[1];
    const b = vqEl('button', 'vbPuce' + (v.id === AT.voiture ? ' on' : ''), '🚗 ' + v.nom + (v.role ? ' · ' + role.replace(/\s*\(.*\)$/, '') : ''));
    b.type = 'button';
    b.setAttribute('data-voiture-v2', v.id);
    b.addEventListener('click', () => { AT.voiture = v.id; AT.etapeEdit = null; if(apres) apres(); atDessiner(); });
    d.appendChild(b);
  });
  if(!atReglages().voitures.length) d.appendChild(vqEl('div', 'vbAide', 'Aucune voiture : ajoute-la dans 📸 Photos et zones.'));
  return d;
}

/* ============================================================
   🧩 LES ÉTAPES DES GESTES
   ============================================================ */
function atVueEtapes(z){
  const v = AT.voiture;
  z.appendChild(vqEl('div', 'vbIntro', 'Ce que l’élève fait dans « Je fais » (le nouveau jeu), geste par geste, sur la voiture choisie : les étapes dans l’ordre, puis ce qu’il montre. Elles viennent de tes photos — le chemin de l’endroit (📸 › 🧭), les feux (📸 › 💡) — et tu peux les changer pour un geste précis.'));
  z.appendChild(atPucesVoitures());
  if(!v) return;
  const cat = atJwCatalogue();
  const gestes = cat.liste.map(id => cat.cartes[id]).filter(c => c.k === 'v');
  const etats = {};
  gestes.forEach(c => { etats[c.id] = atEtatGeste(v, c); });
  const n = { pret: 0, verifier: 0, faire: 0 };
  gestes.forEach(c => { n[etats[c.id].statut]++; });
  z.appendChild(vqEl('div', 'atResume', atVoitureNom(v) + ' : ' + n.pret + ' geste' + (n.pret > 1 ? 's' : '') + ' prêt' + (n.pret > 1 ? 's' : '') + ' sur ' + gestes.length +
    (n.verifier ? ' · ' + n.verifier + ' à vérifier' : '') + (n.faire ? ' · ' + n.faire + ' en questions-réponses' : '') + '.'));
  z.appendChild(atPanneauAppuis(v));
  /* filtres */
  const f = vqEl('div', 'vbRang atFiltres');
  const ch = vqEl('input', 'vbCherche'); ch.type = 'text'; ch.placeholder = '🔎 Un numéro ou un mot (« huile », « feux »…)'; ch.value = AT.etapeCherche || ''; ch.setAttribute('data-hors-saisie', '1');
  f.appendChild(ch);
  const puces = vqEl('div', 'vbSeg');
  [['', 'Tous']].concat(AT_JW_THEMES).concat([['@faire', '⚠️ À revoir']]).forEach(([k, t]) => {
    const b = vqEl('button', 'vbPuce' + ((AT.etapeTheme || '') === k ? ' on' : ''), t); b.type = 'button';
    b.setAttribute('data-theme-etapes', k);
    b.addEventListener('click', () => { AT.etapeTheme = k; atDessiner(); });
    puces.appendChild(b);
  });
  f.appendChild(puces);
  z.appendChild(f);
  const liste = vqEl('div', 'atGestes');
  z.appendChild(liste);
  const dessinerListe = () => {
    liste.innerHTML = '';
    const t = atJwNorm(AT.etapeCherche || ''), num = /^\d{1,3}$/.test(t) ? Number(t) : 0;
    const vus = gestes.filter(c => {
      if(AT.etapeTheme === '@faire' && etats[c.id].statut === 'pret') return false;
      if(AT.etapeTheme && AT.etapeTheme !== '@faire' && c.theme !== AT.etapeTheme) return false;
      if(num) return c.ns.indexOf(num) !== -1;
      return !t || atJwNorm(c.q).indexOf(t) !== -1;
    });
    if(!vus.length) liste.appendChild(vqEl('div', 'vbAide', 'Aucun geste ne correspond.'));
    vus.forEach(c => liste.appendChild(atLigneGeste(v, c, etats[c.id])));
  };
  ch.addEventListener('input', () => { AT.etapeCherche = ch.value; dessinerListe(); });
  dessinerListe();
  if(AT.etapeOuvert){
    const o = liste.querySelector('[data-geste="' + AT.etapeOuvert + '"]');
    AT.etapeOuvert = '';
    if(o) setTimeout(() => { try{ o.scrollIntoView({ block: 'center' }); }catch(e){} }, 60);
  }
}
function atLigneGeste(v, c, e){
  const d = vqEl('div', 'atGeste ' + e.statut);
  d.setAttribute('data-geste', c.id);
  const h = vqEl('div', 'atGesteH');
  const st = AT_STATUTS[e.statut];
  h.appendChild(vqEl('span', 'st', st[0] + ' ' + st[1]));
  const t = vqEl('div', 't');
  t.appendChild(vqEl('b', '', atNomCourt(c.q)));
  t.appendChild(vqEl('small', '', 'Question' + (c.ns.length > 1 ? 's ' : ' ') + c.ns.join(' · ') + (c.m && c.ns.indexOf(c.m) === -1 ? ' (se joue avec la ' + c.m + ')' : '') +
    (e.propre ? ' · ✏️ étapes réglées pour ce geste' : '')));
  h.appendChild(t);
  d.appendChild(h);
  d.appendChild(atChipsEtapes(e));
  e.soucis.forEach(s => d.appendChild(vqEl('div', 'atSouci', s)));
  const bts = vqEl('div', 'atBtns');
  const bouton = (txt, quoi) => { const b = vqEl('button', 'btn btn-secondary', txt); b.type = 'button'; b.addEventListener('click', quoi); bts.appendChild(b); return b; };
  if(e.mode === 'zone') bouton('✏️ Changer les étapes', () => { AT.etapeEdit = { v: v, id: c.id, m: c.m, l: null }; AT.etapesAussi = {}; atDessiner(); });
  if(e.mode === 'allumer') bouton('💡 Régler les feux', () => { AT.vue = 'photos'; AT.endroit = 'volant'; AT.etat = ''; AT.allumage = e.allumage; AT.allumageEdit = null; atDessiner(); });
  if(c.m) bouton(e.mode === 'rien' ? '📸 La placer sur une photo' : '🔧 Régler la question ' + c.m, () => {
    AT.vue = 'photos'; AT.regleN = c.m; AT.regleAussi = {};
    if(e.endroit){ AT.endroit = e.endroit; AT.etat = ''; }
    else { const g = { capot: 'capot', feux: 'volant', voyants: 'voyants', volant: 'volant', autour: 'devant' }[c.theme]; if(g){ AT.endroit = g; AT.etat = ''; } }
    atDessiner();
  });
  d.appendChild(bts);
  if(AT.etapeEdit && AT.etapeEdit.v === v && AT.etapeEdit.id === c.id) d.appendChild(atEditeurEtapes(v, c, e));
  return d;
}
/* Ce que l'élève peut toucher avant de montrer : les passages et les commandes des photos de cette voiture */
function atTouchables(v){
  const l = [];
  AT_ORDRE_PARTIES.forEach(en => {
    const p = atPhotoDe(v, en);
    if(p) p.zones.filter(z => z.sorte === 'passage' || z.sorte === 'commande').forEach(z =>
      l.push({ cle: p.id + ':' + z.id, t: atNomEndroit(en) + ' › ' + (z.sorte === 'commande' ? '🔘 ' : '➡️ ') + (z.nom || 'sans nom') }));
  });
  return l;
}
function atEditeurEtapes(v, c, e){
  const b = vqEl('div', 'atP atEdEtapes');
  const ed = AT.etapeEdit;
  const touch = atTouchables(v);
  if(!ed.l){
    const propre = atEtapesPropres(v, c.m);
    const base = propre || (((atReglages().chemins[v] || {})[e.endroit]) || []);
    ed.l = base.map(s => s.photo + ':' + s.zone);
  }
  b.appendChild(vqEl('h4', '', '✏️ Les étapes de ce geste — ' + atVoitureNom(v)));
  if(!touch.length){
    b.appendChild(vqEl('div', 'vbAide', 'Dessine d’abord, sur les photos de cette voiture, les zones ➡️ « passage » (porte, manette, capot…) ou 🔘 « commande » (contact, bouton…).'));
  }
  b.appendChild(vqEl('div', 'vbAide', 'Ce qu’il touche, dans l’ordre, avant de montrer la réponse. Une étape en trop, mal placée ou oubliée : il recommence à cette étape (« pas encore »).'));
  const ol = vqEl('ol', 'atEtapes');
  ed.l.forEach((cle, i) => {
    const li = vqEl('li', '');
    const sel = vqEl('select', 'vbIn');
    sel.setAttribute('aria-label', 'Étape ' + (i + 1));
    touch.forEach(x => sel.appendChild(new Option(x.t, x.cle)));
    if(!touch.some(x => x.cle === cle)) sel.appendChild(new Option('⚠️ une zone qui n’existe plus', cle));
    sel.value = cle;
    sel.addEventListener('change', () => { ed.l[i] = sel.value; });
    li.appendChild(sel);
    const mini = (t, quoi, titre) => { const x = vqEl('button', 'atMini', t); x.type = 'button'; x.title = titre; x.setAttribute('aria-label', titre); x.addEventListener('click', quoi); li.appendChild(x); };
    mini('↑', () => { if(i){ const t = ed.l[i - 1]; ed.l[i - 1] = ed.l[i]; ed.l[i] = t; atDessiner(); } }, 'Monter');
    mini('↓', () => { if(i < ed.l.length - 1){ const t = ed.l[i + 1]; ed.l[i + 1] = ed.l[i]; ed.l[i] = t; atDessiner(); } }, 'Descendre');
    mini('✕', () => { ed.l.splice(i, 1); atDessiner(); }, 'Retirer l’étape');
    ol.appendChild(li);
  });
  b.appendChild(ol);
  if(touch.length){
    const plus = vqEl('button', 'btn btn-secondary atPlus', '➕ Ajouter une étape'); plus.type = 'button';
    plus.addEventListener('click', () => { ed.l.push(touch[0].cle); atDessiner(); });
    b.appendChild(plus);
  }
  b.appendChild(vqEl('div', 'atFinEtapes', 'Puis il montre : ' + e.fin.map(x => x.ic + ' ' + x.nom).join(' · ')));
  b.appendChild(atAussi(v, AT.etapesAussi = AT.etapesAussi || {}, 'Pareil sur :'));
  const bts = vqEl('div', 'atBtns');
  const ok = vqEl('button', 'btn btn-primary', '💾 Enregistrer les étapes'); ok.type = 'button';
  ok.addEventListener('click', () => {
    const r = atCopieReglages();
    r.etapes = r.etapes || {};
    const l = ed.l.map(x => { const [ph, zo] = x.split(':'); return { photo: Number(ph), zone: zo }; });
    const cibles = [v].concat(Object.keys(AT.etapesAussi).filter(k => AT.etapesAussi[k]));
    const manque = [];
    cibles.forEach(x => {
      r.etapes[x] = r.etapes[x] || {};
      r.etapes[x][String(c.m)] = l;
      l.forEach(s => { const p = atPhotos().find(y => y.id === s.photo); if(p && p.voitures.indexOf(x) === -1 && manque.indexOf(x) === -1) manque.push(x); });
    });
    AT.etapeOuvert = c.id;
    atReglagesPoser(r, ok, '🧩 Étapes enregistrées' + (cibles.length > 1 ? ' pour ' + cibles.length + ' voitures' : '')).then(res => {
      if(res && manque.length) showToastVerifs('⚠️ ' + manque.map(atVoitureNom).join(', ') + ' n’a pas ces photos : coche-la sous les photos, ou règle ses étapes à part.');
      AT.etapeEdit = null; AT.etapesAussi = {}; atRedessiner();
    });
  });
  bts.appendChild(ok);
  if(atEtapesPropres(v, c.m)){
    const re = vqEl('button', 'btn btn-secondary', '↺ Reprendre le chemin de « ' + atNomEndroit(e.endroit) + ' »'); re.type = 'button';
    re.addEventListener('click', () => {
      const r = atCopieReglages();
      if(r.etapes && r.etapes[v]){ delete r.etapes[v][String(c.m)]; if(!Object.keys(r.etapes[v]).length) delete r.etapes[v]; }
      AT.etapeOuvert = c.id;
      atReglagesPoser(r, re, '↺ Ce geste reprend le chemin de l’endroit').then(() => { AT.etapeEdit = null; atRedessiner(); });
    });
    bts.appendChild(re);
  }
  const an = vqEl('button', 'btn btn-secondary', 'Annuler'); an.type = 'button';
  an.addEventListener('click', () => { AT.etapeEdit = null; atDessiner(); });
  bts.appendChild(an);
  b.appendChild(bts);
  return b;
}
/* 💡 LES APPUIS : ce que chaque appui allume, d'après « Allumer les feux »
   (le même calcul que jwCeQuiSAllume chez l'élève : une suite d'appuis
   allume les feux dont la suite réglée est exactement celle-là) */
function atCeQuiSAllume(v, runs){
  const al = (atReglages().allumages || {})[v] || {}, out = [];
  if(!runs.length) return out;
  Object.keys(al).forEach(a => {
    const st = atAllumageResolu(v, a);
    if(st.length !== runs.length) return;
    for(let k = 0; k < st.length; k++){ if(runs[k].cle !== st[k].photo.id + ':' + st[k].zone.id || runs[k].fois !== st[k].fois) return; }
    out.push(a);
  });
  return out;
}
function atPanneauAppuis(v){
  const d = vqEl('details', 'atP atAppuis');
  const al = (atReglages().allumages || {})[v] || {};
  const regles = Object.keys(al).filter(a => atAllumageResolu(v, a).length);
  d.appendChild(vqEl('summary', '', '💡 Les appuis — ce que l’élève voit s’allumer (' + regles.length + ' feu' + (regles.length > 1 ? 'x' : '') + ' réglé' + (regles.length > 1 ? 's' : '') + ')'));
  if(!regles.length){
    d.appendChild(vqEl('div', 'vbAide', 'Rien de réglé pour cette voiture : 📸 Photos et zones › 💡 Allumer les feux.'));
    return d;
  }
  d.appendChild(vqEl('div', 'vbAide', 'À chaque appui, l’élève voit ce qui s’allume. Ça vient de 💡 Allumer les feux : 1 appui sur la bague = ce que tu as réglé pour 1 appui.'));
  const ul = vqEl('ul', 'atAppuisL');
  AT_ALLUMAGES.forEach(([a, nom]) => {
    const st = atAllumageResolu(v, a);
    if(!st.length) return;
    const li = vqEl('li', '');
    li.appendChild(vqEl('b', '', nom));
    li.appendChild(document.createTextNode(' : ' + st.map(s => (s.zone.nom || 'commande') + ' × ' + s.fois).join(', puis ')));
    /* appui par appui sur la dernière commande */
    const der = st[st.length - 1], avant = st.slice(0, -1).map(s => ({ cle: s.photo.id + ':' + s.zone.id, fois: s.fois }));
    const pas = [];
    for(let k = 1; k <= der.fois; k++){
      const l = atCeQuiSAllume(v, avant.concat([{ cle: der.photo.id + ':' + der.zone.id, fois: k }]));
      pas.push(k + ' appui' + (k > 1 ? 's' : '') + ' → ' + (l.length ? l.map(atNomAllumage).join(' + ') : '🌑 rien de réglé'));
    }
    li.appendChild(vqEl('small', '', pas.join(' · ')));
    ul.appendChild(li);
  });
  d.appendChild(ul);
  return d;
}

/* ============================================================
   🗣️ LES MOTS DE « JE DIS »
   ============================================================ */
function atVueMots(z){
  z.appendChild(vqEl('div', 'vbIntro', '« Je dis » (le nouveau jeu) : l’élève répond à voix haute, sa réponse s’écrit, et elle est juste quand elle contient assez de mots attendus — sans IA. Ils sont tirés de la réponse de la banque ; corrige-les ici : un mot ou une expression par ligne (une expression compte quand tous ses mots y sont), et combien il en faut.'));
  const cat = atJwCatalogue();
  const mots = atReglages().mots || {};
  const cartes = cat.liste.map(id => cat.cartes[id]).filter(c => c.k !== 'v' && c.r);
  const f = vqEl('div', 'vbRang atFiltres');
  const ch = vqEl('input', 'vbCherche'); ch.type = 'text'; ch.placeholder = '🔎 Un numéro ou un mot (« gilet », « PLS »…)'; ch.value = AT.motsCherche || ''; ch.setAttribute('data-hors-saisie', '1');
  f.appendChild(ch);
  const puces = vqEl('div', 'vbSeg');
  const nPerso = cartes.filter(c => mots[c.id]).length;
  [['', 'Toutes · ' + cartes.length], ['q', '🗣️ Sécurité routière'], ['s', '⛑️ Premiers secours'], ['@perso', '✏️ Modifiées · ' + nPerso]].forEach(([k, t]) => {
    const b = vqEl('button', 'vbPuce' + ((AT.motsFiltre || '') === k ? ' on' : ''), t); b.type = 'button';
    b.setAttribute('data-filtre-mots', k);
    b.addEventListener('click', () => { AT.motsFiltre = k; atDessiner(); });
    puces.appendChild(b);
  });
  f.appendChild(puces);
  z.appendChild(f);
  const liste = vqEl('div', 'atGestes');
  z.appendChild(liste);
  const dessiner = () => {
    liste.innerHTML = '';
    const t = atJwNorm(AT.motsCherche || ''), num = /^\d{1,3}$/.test(t) ? Number(t) : 0;
    const vus = cartes.filter(c => {
      if(AT.motsFiltre === '@perso' && !mots[c.id]) return false;
      if(AT.motsFiltre && AT.motsFiltre !== '@perso' && c.k !== AT.motsFiltre) return false;
      if(num) return c.ns.indexOf(num) !== -1;
      return !t || atJwNorm(c.q + ' ' + c.r).indexOf(t) !== -1;
    });
    if(!vus.length) liste.appendChild(vqEl('div', 'vbAide', 'Aucune réponse ne correspond.'));
    vus.forEach(c => liste.appendChild(atLigneMots(c, mots[c.id] || null)));
  };
  ch.addEventListener('input', () => { AT.motsCherche = ch.value; dessiner(); });
  dessiner();
  if(AT.motsOuvert){
    const o = liste.querySelector('[data-carte-mots="' + AT.motsOuvert + '"]');
    AT.motsOuvert = '';
    if(o) setTimeout(() => { try{ o.scrollIntoView({ block: 'center' }); }catch(e){} }, 60);
  }
}
function atBesoinAuto(k){ return k <= 2 ? k : Math.min(5, Math.ceil(k * 0.5)); }
function atLigneMots(c, perso){
  const d = vqEl('div', 'atGeste atMots' + (perso ? ' perso' : ''));
  d.setAttribute('data-carte-mots', c.id);
  const h = vqEl('div', 'atGesteH');
  h.appendChild(vqEl('span', 'st', c.k === 'q' ? '🗣️ Sécurité' : '⛑️ Secours'));
  const t = vqEl('div', 't');
  t.appendChild(vqEl('b', '', atNomCourt(c.q)));
  t.appendChild(vqEl('small', '', 'Question' + (c.ns.length > 1 ? 's ' : ' ') + c.ns.join(' · ') + ' · ' + c.r));
  h.appendChild(t);
  d.appendChild(h);
  const a = atJwAttendus(perso, c.r);
  const besoin = a.besoin || atBesoinAuto(a.liste.length);
  const l = vqEl('div', 'atMotsL');
  a.liste.forEach(x => l.appendChild(vqEl('span', perso ? 'p' : '', x.mot)));
  d.appendChild(l);
  d.appendChild(vqEl('div', 'atCompte', (perso ? '✏️ Tes mots' : '🤖 Mots tirés de la réponse') + ' · il en faut ' + besoin + ' sur ' + a.liste.length));
  const bts = vqEl('div', 'atBtns');
  const b = vqEl('button', 'btn btn-secondary', '✏️ Modifier les mots'); b.type = 'button';
  b.addEventListener('click', () => { AT.motsEdit = c.id; atDessiner(); });
  bts.appendChild(b);
  d.appendChild(bts);
  if(AT.motsEdit === c.id) d.appendChild(atEditeurMots(c, perso));
  return d;
}
function atEditeurMots(c, perso){
  const b = vqEl('div', 'atP atEdMots');
  const a = atJwAttendus(perso, c.r);
  b.appendChild(vqEl('div', 'vbLab', 'Les mots attendus — un par ligne (un mot, ou une expression : « gilet jaune »)'));
  const ta = vqEl('textarea', 'vbIn'); ta.rows = Math.min(12, Math.max(4, a.liste.length + 1));
  ta.value = a.liste.map(x => x.mot).join('\n');
  b.appendChild(ta);
  b.appendChild(vqEl('div', 'vbLab', 'Combien il en faut pour que ce soit juste'));
  const sel = vqEl('select', 'vbIn');
  b.appendChild(sel);
  const lire = () => ta.value.split('\n').map(x => x.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 20);
  const remplir = () => {
    const k = lire().length, garde = sel.value;
    sel.innerHTML = '';
    sel.appendChild(new Option('Automatique (' + atBesoinAuto(k) + ' sur ' + k + ')', '0'));
    for(let i = 1; i <= k; i++) sel.appendChild(new Option(i + ' sur ' + k + (i === k ? ' (tous)' : ''), String(i)));
    sel.value = (garde && Number(garde) <= k) ? garde : String(perso && perso.b && perso.b <= k ? perso.b : 0);
  };
  remplir();
  b.appendChild(vqEl('div', 'vbLab', 'Essaie une réponse comme un élève la dirait'));
  const essai = vqEl('input', 'vbIn'); essai.type = 'text'; essai.placeholder = 'Ex : je mets le gilet et je pose le triangle à 30 mètres'; essai.setAttribute('data-hors-saisie', '1');
  b.appendChild(essai);
  const res = vqEl('div', 'atEssai');
  res.setAttribute('role', 'status');
  b.appendChild(res);
  const tester = () => {
    const dit = essai.value.trim();
    if(!dit){ res.textContent = ''; res.className = 'atEssai'; return; }
    const m = lire();
    const p = m.length ? { m: m, b: Number(sel.value) || 0 } : null;
    const v = atJwVerifier(c.r, dit, p);
    res.className = 'atEssai ' + (v.ok ? 'ok' : 'ko');
    res.textContent = (v.ok ? '✅ Juste' : '❌ Pas encore') + ' — ' + v.trouves.length + ' sur ' + v.total + ' (il en faut ' + v.besoin + ')' +
      (v.manquants.length ? ' · il manque : ' + v.manquants.map(x => '« ' + x.mot + ' »').join(', ') : '');
  };
  ta.addEventListener('input', () => { remplir(); tester(); });
  sel.addEventListener('change', tester);
  essai.addEventListener('input', tester);
  const bts = vqEl('div', 'atBtns');
  const ok = vqEl('button', 'btn btn-primary', '💾 Enregistrer'); ok.type = 'button';
  ok.addEventListener('click', () => {
    const m = lire();
    if(!m.length){ showToastVerifs('Écris au moins un mot, ou reviens aux mots automatiques.'); return; }
    const sansMot = m.filter(x => !atJwMotsDe(x).length);
    if(sansMot.length){ showToastVerifs('⚠️ Trop court pour compter : ' + sansMot.map(x => '« ' + x + ' »').join(', ') + ' (un mot de 4 lettres au moins, ou un nombre).'); return; }
    const r = atCopieReglages();
    r.mots = r.mots || {};
    r.mots[c.id] = { m: m, b: Number(sel.value) || 0 };
    AT.motsOuvert = c.id;
    atReglagesPoser(r, ok, '🗣️ Mots enregistrés').then(() => { AT.motsEdit = ''; atRedessiner(); });
  });
  bts.appendChild(ok);
  if(perso){
    const re = vqEl('button', 'btn btn-secondary', '↺ Revenir aux mots automatiques'); re.type = 'button';
    re.addEventListener('click', () => {
      const r = atCopieReglages();
      if(r.mots) delete r.mots[c.id];
      AT.motsOuvert = c.id;
      atReglagesPoser(r, re, '↺ Mots automatiques').then(() => { AT.motsEdit = ''; atRedessiner(); });
    });
    bts.appendChild(re);
  }
  const an = vqEl('button', 'btn btn-secondary', 'Annuler'); an.type = 'button';
  an.addEventListener('click', () => { AT.motsEdit = ''; atDessiner(); });
  bts.appendChild(an);
  b.appendChild(bts);
  b.appendChild(vqEl('div', 'vbAide', 'Les petits mots (le, de, pour…) ne comptent pas ; « quarante-cinq » vaut « 45 » ; un mot compte aussi au pluriel ou au féminin (« allumé », « allumés »).'));
  return b;
}

/* ============================================================
   📋 CE QUI EST PRÊT
   ============================================================ */
function atVuePret(z){
  z.appendChild(vqEl('div', 'vbIntro', 'Voiture par voiture : les gestes que l’élève fait sur tes photos dans le nouveau jeu, et pour les autres, ce qui manque. Un geste « à faire » se joue quand même, en questions-réponses.'));
  const reg = atReglages();
  const cat = atJwCatalogue();
  const gestes = cat.liste.map(id => cat.cartes[id]).filter(c => c.k === 'v');
  /* à quoi servent les voitures */
  const roles = vqEl('div', 'atP');
  roles.appendChild(vqEl('h4', '', '🧰 Qui joue sur quelle voiture'));
  AT_ROLES_V2.filter(x => x[0]).forEach(([k, t]) => {
    const vs = reg.voitures.filter(v => v.role === k);
    roles.appendChild(vqEl('div', 'atRole' + (vs.length ? '' : ' manque'), t + ' : ' + (vs.length ? vs.map(v => v.nom).join(', ') : '⚠️ aucune voiture — dis-le sous la voiture, dans 📸 Photos et zones')));
  });
  z.appendChild(roles);
  const g = vqEl('div', 'atPretGrille');
  reg.voitures.forEach(v => {
    const n = { pret: 0, verifier: 0, faire: 0 };
    gestes.forEach(c => { n[atEtatGeste(v.id, c).statut]++; });
    const photos = atPhotos().filter(p => p.voitures.indexOf(v.id) !== -1);
    const b = vqEl('div', 'atPretV' + (v.id === AT.voiture ? ' on' : ''));
    b.appendChild(vqEl('b', '', '🚗 ' + v.nom));
    b.appendChild(vqEl('small', '', ((AT_ROLES_V2.find(x => x[0] === (v.role || '')) || ['', ''])[1] || 'pas dans la V2') + ' · ' + photos.length + ' photo' + (photos.length > 1 ? 's' : '')));
    const bar = vqEl('div', 'atBar'); const i = vqEl('i', ''); i.style.width = Math.round(n.pret * 100 / Math.max(1, gestes.length)) + '%'; bar.appendChild(i); b.appendChild(bar);
    b.appendChild(vqEl('div', 'atPretN', '✅ ' + n.pret + ' prêt' + (n.pret > 1 ? 's' : '') + ' · ⚠️ ' + n.verifier + ' à vérifier · ✏️ ' + n.faire + ' à faire, sur ' + gestes.length));
    const bts = vqEl('div', 'atBtns');
    const voir = vqEl('button', 'btn btn-secondary', '🔎 Ce qui manque'); voir.type = 'button';
    voir.addEventListener('click', () => { AT.voiture = v.id; atDessiner(); });
    bts.appendChild(voir);
    const zip = vqEl('button', 'btn btn-secondary', '⬇️ Ses ' + photos.length + ' photos (.zip)'); zip.type = 'button';
    zip.disabled = !photos.length;
    zip.addEventListener('click', () => atTelechargerVoiture(v.id, zip));
    bts.appendChild(zip);
    b.appendChild(bts);
    g.appendChild(b);
  });
  if(!reg.voitures.length) g.appendChild(vqEl('div', 'vbAide', 'Aucune voiture : ajoute-la dans 📸 Photos et zones.'));
  z.appendChild(g);
  const v = AT.voiture;
  if(!v) return;
  const manque = vqEl('div', 'atGestes');
  const aRevoir = gestes.map(c => ({ c: c, e: atEtatGeste(v, c) })).filter(x => x.e.statut !== 'pret');
  z.appendChild(vqEl('h4', 'atTitreListe', atVoitureNom(v) + ' — ' + (aRevoir.length ? aRevoir.length + ' geste' + (aRevoir.length > 1 ? 's' : '') + ' à compléter' : 'tout est prêt 🎉')));
  ['verifier', 'faire'].forEach(st => aRevoir.filter(x => x.e.statut === st).forEach(x => {
    const d = vqEl('div', 'atGeste ' + st);
    const h = vqEl('div', 'atGesteH');
    h.appendChild(vqEl('span', 'st', AT_STATUTS[st].join(' ')));
    const t = vqEl('div', 't'); t.appendChild(vqEl('b', '', atNomCourt(x.c.q))); t.appendChild(vqEl('small', '', 'Question' + (x.c.ns.length > 1 ? 's ' : ' ') + x.c.ns.join(' · '))); h.appendChild(t);
    d.appendChild(h);
    x.e.soucis.forEach(s => d.appendChild(vqEl('div', 'atSouci', s)));
    const b = vqEl('button', 'btn btn-secondary', '🧩 Voir ce geste'); b.type = 'button';
    b.addEventListener('click', () => { AT.vue = 'etapes'; AT.etapeTheme = ''; AT.etapeCherche = ''; AT.etapeOuvert = x.c.id; atDessiner(); });
    const bts = vqEl('div', 'atBtns'); bts.appendChild(b); d.appendChild(bts);
    manque.appendChild(d);
  }));
  z.appendChild(manque);
}

/* ============================================================
   ⬇️ TÉLÉCHARGER SES PHOTOS — David : « je ne peux pas les récupérer
   depuis l'appli ». Une photo, ou toutes celles d'une voiture dans un
   seul fichier .zip (rangé sans compression : ce sont déjà des JPEG).
   ============================================================ */
/* ⚠️ Des noms en lettres simples : un nom avec accents ou « — » n'est pas
   repris par tous les navigateurs (le fichier s'appelait « download ») */
function atNomFichier(t){
  return String(t || 'photo').replace(/n°\s*/gi, 'n').replace(/[—–]/g, '-').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ()._,'-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90) || 'photo';
}
function atExtension(type){ return /png/.test(type) ? '.png' : /webp/.test(type) ? '.webp' : '.jpg'; }
function atNomDePhoto(p, v){
  return atNomFichier((v ? atVoitureNom(v) : (p.voitures.map(atVoitureNom).join(', ') || 'sans voiture')) + ' — ' +
    atNomEndroit(p.endroit).replace(/^\S+\s/, '') + (p.etat ? ' — ' + atNomAllumage(p.etat).replace(/^\S+\s/, '') + ' allumés' : ''));
}
async function atLireLaPhoto(p){
  const r = await fetch(atLien(p));
  if(!r.ok) throw new Error('photo illisible (' + r.status + ')');
  return r.blob();
}
function atEnregistrer(blob, nom){
  const u = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = u; a.download = nom; a.style.display = 'none';
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(u); a.remove(); }, 4000);
}
async function atTelechargerPhoto(p, bouton){
  const avant = bouton ? bouton.textContent : '';
  if(bouton){ bouton.disabled = true; bouton.textContent = '⬇️ …'; }
  try{
    const b = await atLireLaPhoto(p);
    atEnregistrer(b, atNomDePhoto(p, AT.voiture) + atExtension(b.type));
  }catch(e){ showToastVerifs('⚠️ Téléchargement impossible : ' + ((e && e.message) || e)); }
  finally{ if(bouton){ bouton.disabled = false; bouton.textContent = avant; } }
}
async function atTelechargerVoiture(v, bouton){
  const photos = atPhotos().filter(p => p.voitures.indexOf(v) !== -1);
  if(!photos.length) return;
  const avant = bouton ? bouton.textContent : '';
  if(bouton) bouton.disabled = true;
  try{
    const fichiers = [], pris = {};
    for(let i = 0; i < photos.length; i++){
      if(bouton) bouton.textContent = '⬇️ ' + (i + 1) + ' / ' + photos.length + '…';
      const b = await atLireLaPhoto(photos[i]);
      let nom = atNomDePhoto(photos[i], v), k = 2;
      while(pris[nom]) nom = atNomDePhoto(photos[i], v) + ' (' + (k++) + ')';
      pris[nom] = 1;
      fichiers.push({ nom: nom + atExtension(b.type), octets: new Uint8Array(await b.arrayBuffer()) });
    }
    atEnregistrer(atZip(fichiers), atNomFichier('Photos du jeu — ' + atVoitureNom(v)) + '.zip');
    showToastVerifs('⬇️ ' + photos.length + ' photo' + (photos.length > 1 ? 's' : '') + ' de ' + atVoitureNom(v));
  }catch(e){ showToastVerifs('⚠️ Téléchargement impossible : ' + ((e && e.message) || e)); }
  finally{ if(bouton){ bouton.disabled = false; bouton.textContent = avant; } }
}
/* Un .zip sans compression (méthode 0), noms en UTF-8 */
let AT_CRC = null;
function atCrc32(o){
  if(!AT_CRC){ AT_CRC = new Uint32Array(256); for(let n = 0; n < 256; n++){ let c = n; for(let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); AT_CRC[n] = c >>> 0; } }
  let c = 0xFFFFFFFF;
  for(let i = 0; i < o.length; i++) c = AT_CRC[(c ^ o[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function atZip(fichiers){
  const enc = new TextEncoder(), parts = [], centre = [];
  const d = new Date();
  const heure = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF;
  const jour = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF;
  let pos = 0;
  fichiers.forEach(f => {
    const nom = enc.encode(f.nom), crc = atCrc32(f.octets), t = f.octets.length;
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
    h.setUint16(10, heure, true); h.setUint16(12, jour, true); h.setUint32(14, crc, true); h.setUint32(18, t, true); h.setUint32(22, t, true);
    h.setUint16(26, nom.length, true); h.setUint16(28, 0, true);
    parts.push(h.buffer, nom, f.octets);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
    c.setUint16(12, heure, true); c.setUint16(14, jour, true); c.setUint32(16, crc, true); c.setUint32(20, t, true); c.setUint32(24, t, true);
    c.setUint16(28, nom.length, true); c.setUint16(30, 0, true); c.setUint16(32, 0, true); c.setUint16(34, 0, true); c.setUint16(36, 0, true);
    c.setUint32(38, 0, true); c.setUint32(42, pos, true);
    centre.push(c.buffer, nom);
    pos += 30 + nom.length + t;
  });
  const tailleCentre = centre.reduce((s, x) => s + (x.byteLength || x.length), 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, fichiers.length, true); fin.setUint16(10, fichiers.length, true);
  fin.setUint32(12, tailleCentre, true); fin.setUint32(16, pos, true); fin.setUint16(20, 0, true);
  return new Blob(parts.concat(centre).concat([fin.buffer]), { type: 'application/zip' });
}
