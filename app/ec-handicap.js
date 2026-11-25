/* Déployé le 25/11/2026 à 12:04 — v1568 */
/* ============================================================
   ec-handicap.js — 🩺 LES DÉMARCHES PERMIS (v1565)

   David, le 25/11 : « comme pour les financements, un truc de ce
   qu'il y a à faire », puis « séparer handicap d'un côté et
   annulation suspension de l'autre, ça n'a rien à voir ». Deux écrans
   dans Élèves › Administratif, et l'onglet ♿ du dossier de l'élève :
   · ♿ Permis aménagé (remplace ♿ Handicap) : régularisation (il a
     déjà le permis) et premier permis aménagé ;
   · ⛔ Suspension · annulation : suspension, annulation, invalidation.
   Chacun : 📂 Dossiers, 🗺️ En bref (l'infographie, sans dossier),
   📇 Contacts ; le permis aménagé a aussi ⚡ Codes et 🔍 Maladies.

   Ses réponses au schéma (version 2.3) :
   · les dossiers de l'onglet HANDICAP du classeur sont repris une
     fois, par le Worker (reprendreLeSuiviHandicap) ;
   · le mail « où il en est » est proposé, il part sur « Envoyer » ;
     vouvoiement par défaut, un bouton pour tutoyer ;
   · tout le monde voit les deux écrans (droit « demarches ») ;
   · c'est le médecin agréé qui donne les codes ; l'inspecteur a le
     dernier mot sur ceux des aménagements (guide DSR 2025) ;
   · notre voiture : boîte auto, accélérateur à gauche, boules (simple
     ou commandes déportées, à gauche ou à droite), rétroviseurs 42,
     42.01, 42.03. « Tourne mal la tête » et « petite taille » ne sont
     pas « pas sur notre voiture » : ça dépend des codes du médecin ;
   · l'examen psychotechnique : règle officielle (annulation,
     invalidation, suspension de 6 mois ou plus) ; son résultat est
     personnel, on ne le demande jamais ;
   · les 9 mois : passés sans inscription ANTS, code ET conduite ;
   · la liste des médecins agréés : un PDF déposé par un
     administrateur (le site de la DDTM ne la donne pas toujours),
     joint aux mails de visite ; les psychologues : une recherche ;
     Trestel : 02 96 05 65 65.

   Règles relues le 25/11/2026 : service-public F14836 (vérifiée le
   12/10/2026), F1704 (19/06/2026), F21774 (01/04/2026), F2842
   (17/04/2026) ; guide DSR « Les codes sur le permis pour des raisons
   médicales » (2025) ; brochure DSR « Conduire avec un handicap
   moteur » (avril 2025) ; fiches des préfectures (Loire, Lozère,
   Essonne, Ardèche, Tarn-et-Garonne).

   Les données vivent dans D1 (table « demarches »), les papiers dans
   R2 : voir « LES DÉMARCHES PERMIS » dans le Worker.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */
(function(){
'use strict';
const $ = (s, r) => (r || document).querySelector(s);
const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
/* les dates en heure de France, pas en UTC : un dossier noté à minuit
   et demie ne doit pas dire « fait hier » */
const isoLocal = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const aujourdHui = () => isoLocal(new Date());
const frDate = (iso) => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; };
const plusMois = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setMonth(d.getMonth() + n); return isoLocal(d); };
const plusJours = (iso, n) => { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return isoLocal(d); };
const jours = (iso) => Math.round((new Date(iso + 'T12:00:00') - new Date(aujourdHui() + 'T12:00:00')) / 86400000);

/* ---------- les liens officiels ---------- */
const L = {
  cerfa: 'https://www.service-public.gouv.fr/particuliers/vosdroits/R14006',
  questionnaire: 'https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000045464094',
  medecins: 'https://www.cotes-darmor.gouv.fr/demarches/vehicules/renouvellement-de-permis-de-conduire-apres-suspension-ou-annulation-prise-de-rendez-vous',
  rdvPref: 'https://www.rdv-prefecture.interieur.gouv.fr/rdvpref/reservation/demarche/1480/',
  antsInscr: 'https://www.service-public.gouv.fr/particuliers/vosdroits/R49186',
  antsRegul: 'https://www.service-public.gouv.fr/particuliers/vosdroits/R67361',
  antsSusp: 'https://www.service-public.gouv.fr/particuliers/vosdroits/R65232',
  antsAnnulInscr: 'https://www.service-public.gouv.fr/particuliers/vosdroits/R63504',
  antsAnnulTitre: 'https://www.service-public.gouv.fr/particuliers/vosdroits/R63568',
  sante: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F2686',
  susp: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F14836',
  invalid: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F1704',
  annul: 'https://www.service-public.gouv.fr/particuliers/vosdroits/F21774',
  psychos: 'https://www.google.com/search?q=test+psychotechnique+permis+22'
};
/* 📎 la liste des médecins agréés déposée par un administrateur (elle change souvent) */
let LISTE_MEDECINS = null;
const lien = (k, t) => '<a href="' + L[k] + '" target="_blank" rel="noopener" style="color:var(--accent-text);font-weight:700;">' + esc(t) + ' ↗</a>';

/* ============================================================
   LES CODES (guide DSR « codes sur le permis pour raisons
   médicales », 2025 — annexe I de l'arrêté du 20 avril 2012)
   seul : le médecin agréé l'inscrit seul, sans passage devant
   l'inspecteur. Sinon : mise en situation (régularisation ou
   examen) devant l'inspecteur.
   ============================================================ */
const CODES = [
  ['01.01', 'Lunettes', true], ['01.02', 'Lentilles de contact', true], ['01.05', 'Couvre-œil', true], ['01.06', 'Lunettes ou lentilles de contact', true], ['01.07', 'Aide optique spécifique', true],
  ['02', 'Prothèse auditive / aide à la communication', true],
  ['03.01', 'Prothèse / orthèse d’un membre supérieur', false], ['03.02', 'Prothèse / orthèse d’un membre inférieur', false],
  ['10.02', 'Boîte de vitesses automatique', true], ['10.04', 'Dispositif adapté de contrôle de la transmission', false],
  ['15.01', 'Pédale d’embrayage adaptée', false], ['15.02', 'Embrayage manuel', false], ['15.03', 'Embrayage automatique', true], ['15.04', 'Pédale d’embrayage neutralisée', false],
  ['20.01', 'Pédale de frein adaptée', false], ['20.03', 'Pédale de frein adaptée pour le pied gauche', false], ['20.04', 'Pédale de frein à glissière', false], ['20.05', 'Pédale de frein à bascule', false],
  ['20.06', 'Frein principal actionné par la main', false], ['20.07', 'Frein avec une force maximale de … N', false], ['20.09', 'Frein de stationnement adapté', false],
  ['20.12', 'Pédale de frein neutralisée', false], ['20.13', 'Frein à commande au genou', false], ['20.14', 'Frein assisté par une force extérieure', false],
  ['25.01', 'Pédale d’accélérateur adaptée', false], ['25.03', 'Pédale d’accélérateur à bascule', false], ['25.04', 'Accélérateur actionné par la main', false],
  ['25.05', 'Accélérateur actionné par le genou', false], ['25.06', 'Accélérateur assisté par une force extérieure', false],
  ['25.08', 'Pédale d’accélérateur placée à gauche', false], ['25.09', 'Pédale d’accélérateur neutralisée', false],
  ['31.01', 'Jeu supplémentaire de pédales parallèles', false], ['31.02', 'Pédales dans le même plan', false], ['31.03', 'Pédales neutralisées quand elles ne sont pas actionnées au pied', false], ['31.04', 'Plancher surélevé', false],
  ['32.01', 'Accélérateur et frein combinés, à une main (oblige la boule au volant)', false], ['32.02', 'Accélérateur et frein combinés, assistés', false],
  ['33.01', 'Frein, accélérateur et direction combinés, assistés, une main', false], ['33.02', 'Frein, accélérateur et direction combinés, assistés, deux mains', false],
  ['35.02', 'Commandes (feux, clignotants, essuie-glace, klaxon) sans lâcher le volant', false],
  ['35.03', 'Commandes sans lâcher le volant, main gauche (avec 40.11)', false], ['35.04', 'Commandes sans lâcher le volant, main droite (avec 40.11)', false],
  ['35.05', 'Commandes sans lâcher le volant ni l’accélérateur et le frein', false],
  ['40.01', 'Direction avec une force maximale de … N', false], ['40.05', 'Volant adapté', false], ['40.06', 'Position du volant adaptée', false], ['40.09', 'Direction aux pieds', false],
  ['40.11', 'Dispositif d’assistance sur le volant (boule, fourche)', false], ['40.14', 'Direction adaptée à une seule main ou un seul bras', false],
  ['42', 'Rétroviseurs des deux côtés', true], ['42.01', 'Vision arrière adaptée (grand angle, panoramique, caméra)', false],
  ['42.03', 'Dispositif intérieur supplémentaire de vision latérale', false], ['42.05', 'Dispositif de vision d’angle mort', false],
  ['43.01', 'Siège à bonne hauteur et bonne distance du volant et des pédales', false], ['43.02', 'Siège à la forme du corps', false],
  ['43.03', 'Siège avec soutien latéral', false], ['43.04', 'Siège avec accoudoir', false], ['43.07', 'Ceinture avec soutien pour la stabilité', false],
  ['61', 'Trajets de jour uniquement', true], ['62', 'Trajets dans un rayon de … km', true], ['63', 'Sans passager', true], ['64', 'Vitesse limitée à … km/h', true],
  ['65', 'Seulement accompagné d’un titulaire du permis', true], ['66', 'Sans remorque', true], ['67', 'Pas d’autoroute', true], ['68', 'Pas d’alcool', true], ['69', 'Éthylotest anti-démarrage', true],
  ['78', 'Limité à la boîte automatique (examen passé en boîte auto : code administratif, pas médical)', true]
];
/* 🚘 ce que nous avons sur notre voiture aménagée (dit par David le 25/11/2026) */
const NOTRE_VOITURE = [
  { t: 'Boîte automatique', codes: ['10.02'] },
  { t: 'Accélérateur à gauche', codes: ['25.08'] },
  { t: 'Boule au volant simple, à gauche ou à droite', codes: ['40.11'] },
  { t: 'Boule avec commandes déportées, à gauche ou à droite', codes: ['40.11', '35.02', '35.03', '35.04'] },
  { t: 'Rétroviseurs additionnels', codes: ['42', '42.01', '42.03'] }
];
const SUR_NOTRE_VOITURE = new Set(['10.02', '15.03'].concat(...NOTRE_VOITURE.map(x => x.codes)));
const estAmenagement = (cd) => { const n = Number(String(cd).split('.')[0]); return n >= 10 && n <= 44; };
/* Vision (42) et siège (43, plancher 31.04) : David, le 25/11 — « tourne
   mal la tête » et « petite taille », « ça dépend des codes que mettra le
   médecin, on peut certainement faire les formations ». Pas de ✖️ : ❓. */
const aVoirMedecin = (cd) => /^(42|43)\./.test(String(cd)) || String(cd) === '31.04';
const pasChezNous = (codes) => (codes || []).filter(cd => estAmenagement(cd) && !SUR_NOTRE_VOITURE.has(cd) && !aVoirMedecin(cd));
const aVoir = (codes) => (codes || []).filter(cd => estAmenagement(cd) && !SUR_NOTRE_VOITURE.has(cd) && aVoirMedecin(cd));
const badgeVoiture = (cd) => !estAmenagement(cd) ? '' : (SUR_NOTRE_VOITURE.has(cd) ? ' <span title="Sur notre voiture">🚘</span>'
  : (aVoirMedecin(cd) ? ' <span title="Selon les codes du médecin : la formation est sans doute possible">❓</span>' : ' <span title="Pas sur notre voiture" style="color:var(--red);">✖️</span>'));
const CODE = {}; CODES.forEach(([c, n, s]) => { CODE[c] = { c: c, n: n, seul: s }; });
/* 🔍 v1567 — chercher un code que le médecin a mis (David) : par son
   numéro, ou par les mots qu'on dit au bureau */
const MOTS_CODES = { '01': 'lunettes lentilles vue yeux', '02': 'appareil auditif oreille surdite sourd', '03': 'prothese orthese membre bras jambe',
  '10': 'boite auto automatique vitesses', '15': 'embrayage', '20': 'frein freinage pied gauche main', '25': 'accelerateur pedale gauche main genou',
  '31': 'pedales plancher', '32': 'frein accelerateur main boule cercle', '33': 'joystick direction', '35': 'commandes deportees clignotants feux essuie glace klaxon boule satellite',
  '40': 'volant direction boule fourche pommeau', '42': 'retroviseur retro miroir angle mort camera', '43': 'siege ceinture taille',
  '61': 'jour nuit', '62': 'rayon km distance', '63': 'passager', '64': 'vitesse limitee', '65': 'accompagne', '66': 'remorque', '67': 'autoroute', '68': 'alcool', '69': 'ethylotest ead anti demarrage alcool', '78': 'boite auto automatique administratif' };
const sansAccent = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
function chercherCodes(q){
  const mots = sansAccent(q).replace(/,/g, '.').split(/\s+/).filter(Boolean);
  if(!mots.length) return [];
  return CODES.filter(([cd, n]) => {
    const tout = cd + ' ' + sansAccent(n) + ' ' + (MOTS_CODES[cd.split('.')[0]] || '');
    return mots.every(w => /^\d/.test(w) ? (cd === w || cd.indexOf(w) === 0 || cd.replace('.', '') === w) : tout.indexOf(w) !== -1);
  }).slice(0, 15).map(x => x[0]);
}

/* ⚡ les situations → les codes probables (indicatif : le médecin
   agréé fixe les codes, l'inspecteur vérifie les aménagements) */
const SITUATIONS = [
  { k: 'lunettes', t: '👓 Porte des lunettes ou des lentilles', codes: ['01.06'] },
  { k: 'auditif', t: '🦻 Appareil auditif / surdité', codes: ['02', '42'] },
  { k: 'nuit', t: '🌙 Voit mal la nuit', codes: ['61'] },
  { k: 'cou', t: '↔️ Tourne mal la tête', codes: ['42', '42.01', '42.05'] },
  { k: 'jambeG', t: '🦵 Jambe gauche : ne peut pas embrayer', codes: ['10.02'] },
  { k: 'jambeD', t: '🦵 Jambe droite : ne peut ni accélérer ni freiner', codes: ['10.02', '25.08'] },
  { k: 'jambes', t: '♿ Les deux jambes (paraplégie)', codes: ['10.02', '32.01', '40.11', '35.02'] },
  { k: 'brasG', t: '💪 Bras gauche inutilisable', codes: ['10.02', '40.11', '35.04'] },
  { k: 'brasD', t: '💪 Bras droit inutilisable', codes: ['10.02', '40.11', '35.03'] },
  { k: 'hemiD', t: '🧠 Hémiplégie droite', codes: ['10.02', '25.08', '40.11', '35.03'] },
  { k: 'hemiG', t: '🧠 Hémiplégie gauche', codes: ['10.02', '40.11', '35.04'] },
  { k: 'protheseJ', t: '🦿 Prothèse de jambe', codes: ['03.02', '10.02'] },
  { k: 'protheseB', t: '🦾 Prothèse de bras', codes: ['03.01', '40.11'] },
  { k: 'force', t: '🫳 Peu de force pour tourner le volant', codes: ['40.01'] },
  { k: 'taille', t: '📏 Petite taille (pédales trop loin)', codes: ['31.04', '43.01'] }
];

/* ============================================================
   🔍 MALADIES ET CONDUITE (groupe léger, permis B) — d'après le
   « Mémento pour le médecin d'un patient conducteur » (DSR, avril
   2022), qui résume l'arrêté du 28 mars 2022. Le médecin agréé
   décide ; ceci dit à quoi s'attendre.
   ============================================================ */
const ST = {   /* couleurs lisibles en clair et en sombre */
  def: { t: 'Incompatible définitivement', c: '#E5484D', fond: 'rgba(229,72,77,.12)' },
  temp: { t: 'Incompatible pour un temps', c: '#D97706', fond: 'rgba(245,158,11,.14)' },
  tempdef: { t: 'Incompatible pour un temps ou définitivement', c: '#A855F7', fond: 'rgba(168,85,247,.12)' },
  amen: { t: 'Compatible avec aménagement', c: '#65A30D', fond: 'rgba(132,204,22,.15)' },
  compat: { t: 'Compatible (contrôle médical)', c: '#0D9488', fond: 'rgba(20,184,166,.14)' },
  libre: { t: 'Pas de contrôle médical obligatoire', c: 'var(--muted)', fond: 'rgba(127,127,127,.10)' }
};
const MALADIES = [
  ['Vision', 'Acuité inférieure à 5/10 des deux yeux, même corrigée', 'def', ''],
  ['Vision', 'Champ visuel insuffisant (moins de 120° en horizontal…)', 'def', ''],
  ['Vision', 'Vision double permanente, strabisme décompensé (sans traitement possible)', 'def', ''],
  ['Vision', 'Après une chirurgie des yeux (réfraction)', 'temp', 'Tant que l’acuité et le champ ne sont pas revenus.'],
  ['Vision', 'Nystagmus', 'compat', 'Si acuité et champ visuel suffisants.'],
  ['Vision', 'Mauvaise vision de nuit', 'compat', 'Mention « conduite de jour » (61).'],
  ['Vision', 'Lunettes ou lentilles (simple correction)', 'libre', 'Code 01 si l’acuité le demande.'],
  ['Audition', 'Surdité légère (entend la voix chuchotée à 1 m)', 'libre', ''],
  ['Audition', 'Surdité sévère ou profonde, isolée', 'compat', 'Le médecin agréé fixe les aménagements (02, 42).'],
  ['Équilibre', 'Troubles chroniques de l’équilibre (sauf vertige positionnel bénin)', 'temp', 'Tant qu’ils ne sont pas traités.'],
  ['Neurologie', 'Alzheimer et troubles cognitifs apparentés (stade 3)', 'def', ''],
  ['Neurologie', 'AVC, traumatisme crânien, sclérose en plaques, myopathie, Parkinson…', 'tempdef', 'Bilan par une équipe (neurologue ou MPR + ergothérapeute), puis médecin agréé.'],
  ['Neurologie', 'Épilepsie', 'temp', 'Jusqu’à ce que le risque de crise soit négligeable.'],
  ['Neurologie', 'Accident ischémique transitoire (AIT) traité', 'compat', ''],
  ['Sommeil', 'Somnolence, apnée du sommeil non traitée', 'temp', 'Puis contrôle au moins tous les 3 ans.'],
  ['Psychiatrie', 'Troubles mentaux graves, psychoses', 'temp', ''],
  ['Psychiatrie', 'Troubles graves du jugement ou du comportement', 'temp', ''],
  ['Addictions', 'Alcool (dépendance), drogues', 'temp', ''],
  ['Médicaments', 'Médicament au pictogramme rouge (niveau 3)', 'temp', 'Ne pas conduire pendant le traitement.'],
  ['Cœur', 'Insuffisance cardiaque stade 4', 'def', ''],
  ['Cœur', 'Cardiomyopathie, cardiopathie congénitale avec risque de malaise', 'tempdef', ''],
  ['Cœur', 'Infarctus, syndrome coronarien', 'temp', 'Au moins 4 semaines.'],
  ['Cœur', 'Troubles du rythme, syncopes', 'temp', 'Tant qu’ils ne sont pas traités.'],
  ['Cœur', 'Stimulateur, défibrillateur, greffe cardiaque', 'temp', 'Durée selon l’intervention.'],
  ['Cœur', 'Hypertension maligne, valvulopathie, anévrisme', 'temp', ''],
  ['Diabète', 'Diabète sans traitement à risque d’hypoglycémie, sans complication', 'libre', ''],
  ['Diabète', 'Diabète avec risque d’hypoglycémie maîtrisé', 'compat', 'Contrôle au moins tous les 5 ans.'],
  ['Diabète', 'Ne sent plus ses pieds (neuropathie)', 'amen', 'Véhicule sans pédales possible.'],
  ['Membres', 'Perte ou amputation d’un membre', 'amen', 'Pas le choix : médecin agréé, aménagement, régularisation.'],
  ['Membres', 'Paraplégie, hémiplégie, raideur d’un membre', 'amen', 'Incompatible pendant l’adaptation, jusqu’à la régularisation.'],
  ['Membres', 'Déficit qui demande seulement une boîte automatique', 'compat', 'Mention 10.02 portée par le médecin, sans régularisation.'],
  ['Poumons', 'Insuffisance respiratoire sous oxygène, essoufflé au moindre effort', 'tempdef', ''],
  ['Reins', 'Insuffisance rénale au stade de la dialyse, non équilibrée', 'temp', 'Après chaque dialyse : attendre l’avis du spécialiste.']
].map(([g, t, s, n], i) => ({ id: 'm' + i, g: g, t: t, s: s, n: n }));

/* ============================================================
   LES PARCOURS ET LEURS ÉTAPES
   qui : nous · eleve · medecin · ddtm · pref
   ============================================================ */
const QUI = { nous: ['🏫', 'Nous'], eleve: ['🙋', 'L’élève'], medecin: ['🩺', 'Médecin'], ddtm: ['🏛️', 'DDTM'], pref: ['🏛️', 'Préfecture'], trestel: ['🏥', 'Trestel'] };
/* deux écrans : ♿ Permis aménagé et ⛔ Suspension · annulation */
const OUTILS = {
  handicap: { titre: 'Permis aménagé', em: '♿', parcours: ['regul', 'premier'], sous: 'Régularisations et premiers permis aménagés : chaque dossier, son étape, ses papiers.' },
  susp: { titre: 'Suspension · annulation', em: '⛔', parcours: ['susp', 'annul'], sous: 'Suspensions, annulations et invalidations : ce qu’il doit faire pour reconduire.' }
};
let outil = 'handicap';
const duOutil = (d) => OUTILS[outil].parcours.indexOf(d.parcours) !== -1;
const PARCOURS = {
  regul: { t: 'Régularisation', em: '♿', sous: 'Il a déjà le permis, son handicap ou sa maladie est arrivé après' },
  premier: { t: 'Premier permis aménagé', em: '🆕', sous: 'Pas de permis, il apprend avec les aménagements' },
  susp: { t: 'Suspension', em: '⏸️', sous: 'Son permis est suspendu' },
  annul: { t: 'Annulation / invalidation', em: '⛔', sous: 'Permis annulé par le juge, ou 0 point (lettre 48SI)' }
};

function etapesDe(d){
  const visite = { cle: 'visite', t: 'Visite chez un médecin agréé : il donne les codes', qui: 'eleve', docs: ['avis'],
    bref: ['🩺 Il écrit les codes sur l’avis', '💶 36 € (gratuit si invalidité ≥ 50 %)', '📄 Cerfa 14880', '🚫 Pas le médecin traitant'],
    info: 'Le médecin agréé écrit les codes sur l’avis médical. Pas son médecin traitant. Apporter : pièce d’identité' + (d.parcours === 'regul' ? ', permis' : '') + ', le cerfa 14880 pré-rempli et le questionnaire de santé. 36 € (gratuit si invalidité ≥ 50 %). ' + lien('cerfa', 'Cerfa 14880') + ' · ' + lien('medecins', 'Médecins agréés (22)') };
  const trestel = { cle: 'trestel', t: 'Évaluation à Trestel', qui: 'trestel', docs: ['trestel'], facultatif: true,
    bref: ['Facultative', '📎 Son résumé va dans le dossier'], info: 'Si elle est faite : déposer son résumé ici.' };
  const maladie = { cle: 'maladie', t: 'Maladie ou handicap noté', qui: 'nous', bref: ['🔍 Liste des maladies', '⚡ Codes probables, avant la visite'], info: 'Recherche dans la liste, et ⚡ codes probables : c’est le médecin agréé qui les donnera.' };
  const eval_ = { cle: 'eval', t: 'Évaluation à l’école', qui: 'nous', heures: true, ficheEval: true, docs: ['eval'], bref: ['📋 Fiche d’évaluation handicap', '⏱️ Heures proposées'], info: 'Avec la fiche d’évaluation handicap (🚗 Cours, modèle « Évaluation handicap ») : dépose son PDF dans « Ses papiers ». On propose un nombre d’heures.' };
  if(d.parcours === 'regul'){
    /* que des codes que le médecin pose seul (lunettes, boîte auto…) : pas de passage devant l'inspecteur */
    if(codesSansInspecteur(d)) return [maladie, trestel, visite,
      { cle: 'lecons', t: 'Quelques leçons pour s’habituer (si il le veut)', qui: 'nous', facultatif: true, heures: true, bref: ['Facultatif'] },
      { cle: 'titre', t: 'Demande du nouveau permis sur l’ANTS, avec l’avis médical', qui: 'eleve', bref: ['🚫 Pas de DDTM : le médecin a mis tous les codes', '📄 Avis médical'], info: 'Codes posés par le médecin seul (01, 02, 10.02, 15.03, 42, 61 à 69) : pas de régularisation devant l’inspecteur. ' + lien('antsRegul', 'Demande ANTS') }];
    return [maladie, trestel, visite, eval_,
    { cle: 'accord', t: 'Heures acceptées par l’élève', qui: 'eleve' },
    { cle: 'planning', t: 'Leçons planifiées', qui: 'nous', info: 'Le planning se fait dans Drivup.' },
    { cle: 'pieces', t: 'Pièces pour la DDTM : avis médical, carte d’identité, permis', qui: 'eleve', docs: ['avis', 'ci', 'permis'], obligatoire: true, bref: ['🔒 Obligatoires pour le rendez-vous'] },
    { cle: 'rdv', t: 'Rendez-vous de régularisation à la DDTM', qui: 'nous', rdv: true, bloquePar: 'pieces', bref: ['🚗 20 à 30 min de conduite', '🆓 Gratuit', '🚘 Voiture de l’école'],
      info: 'Conduite presque comme un examen : il montre qu’il sait utiliser ses aménagements. Gratuit. ddtm-er-handicap@cotes-darmor.gouv.fr' },
    { cle: 'regul', t: 'Régularisation validée : l’inspecteur remet le CEPC', qui: 'ddtm', bref: ['📄 CEPC valable 4 mois'], info: 'L’inspecteur vérifie qu’il conduit en sécurité avec les aménagements du médecin, et les reporte sur le CEPC (valable 4 mois).' },
    { cle: 'titre', t: 'Demande du nouveau permis sur l’ANTS', qui: 'eleve', bref: ['📄 Avis médical + CEPC'], info: 'Avec l’avis médical et le CEPC. ' + lien('antsRegul', 'Demande ANTS') }];
  }
  if(d.parcours === 'premier') return [maladie, trestel, visite,
    { cle: 'codif', t: 'Avis médical + pièce d’identité à la DDTM → attestation de codification', qui: 'nous', docs: ['codif'], bref: ['📧 ddtm-er-handicap', '📑 Elle reprend les codes du médecin'],
      info: 'À ddtm-er-handicap@cotes-darmor.gouv.fr. Les codes sont ceux de l’avis du médecin agréé : la DDTM les reprend sur l’attestation de codification.' },
    { cle: 'ants', t: 'Inscription ANTS : cocher « soumis à visite médicale »', qui: 'nous', bref: ['📄 Avis médical joint'], info: 'Joindre l’avis médical. ' + lien('antsInscr', 'Inscription ANTS') },
    eval_,
    { cle: 'accord', t: 'Heures acceptées par l’élève', qui: 'eleve' },
    { cle: 'formation', t: 'Formation avec les aménagements (code et conduite)', qui: 'nous' },
    { cle: 'prevenir', t: 'Prévenir la DDTM avant l’examen : permis aménagé', qui: 'nous' },
    { cle: 'examen', t: 'Examen : avis médical et attestation de codification obligatoires', qui: 'nous', rdv: true, docs: ['avis', 'codif'], obligatoire: true, bref: ['⛔ Sans ces 2 papiers : pas de permis'],
      info: 'Sans ces deux papiers le jour de l’examen : pas de permis.' },
    { cle: 'titre', t: 'Demande du titre sur l’ANTS : avis médical, attestation de codification, CEPC', qui: 'nous' }];
  if(d.parcours === 'susp'){
    const m = Number(d.mois || 0);
    const commission = d.motif === 'alcool' || d.motif === 'stups';
    const out = [{ cle: 'infos', t: 'Suspension notée (durée, motif, date de fin)', qui: 'nous', docs: ['decision'], bref: ['📅 Date de fin', '🍷 Motif', '📄 Décision de suspension'], info: 'Déposer la décision : arrêté de la préfecture (3F après une rétention, 1F sans rétention) ou jugement (réf. 72).' }];
    if(m <= 1 && !commission){ out.push({ cle: 'recup', t: 'Récupérer le permis à la préfecture à la fin', qui: 'eleve', bref: ['🚫 Pas de visite médicale', '🚫 Rien à repasser'], info: '1 mois ou moins, hors alcool et stupéfiants : pas de contrôle médical. ' + lien('susp', 'Service-public') }); return out; }
    /* l'examen psychotechnique n'existe que pour 6 mois ou plus (R. 224-21) */
    if(m >= 6) out.push({ cle: 'psy', t: 'Examen psychotechnique (6 mois ou plus seulement)', qui: 'eleve', bref: ['⚠️ Seulement si 6 mois ou plus', '💶 Environ 100 €', '🧠 Psychologue déclaré en préfecture'], info: 'Seulement parce que la suspension est de 6 mois ou plus. Avant la visite médicale, environ 100 €. Le résultat est personnel : nous n’y avons pas accès, l’élève nous dit quand c’est fait. ' + lien('susp', 'F14836') });
    out.push({ cle: 'visite', t: commission ? 'Commission médicale (préfecture de Saint-Brieuc)' : 'Visite chez un médecin agréé', qui: commission ? 'pref' : 'eleve', docs: ['avis'],
      bref: commission ? ['🍷 Alcool ou stupéfiants', '💶 50 €', '🧪 Analyses avant', '📅 Un mois avant la fin'] : ['💶 36 €', '🚫 Pas le médecin traitant', '📅 Un mois avant la fin'],
      info: (commission ? 'Alcool ou stupéfiants : commission médicale, sur rendez-vous, 50 €, analyses de sang ou d’urine quelques jours avant. ' + lien('rdvPref', 'Rendez-vous préfecture') : 'Suspension de plus d’un mois : médecin agréé, 36 €. ' + lien('medecins', 'Médecins agréés (22)')) + ' Sans attendre la fin : environ un mois avant.' });
    out.push({ cle: 'ants', t: 'Demande de permis sur l’ANTS', qui: 'eleve', docs: ['avis', 'decision', 'ci', 'domicile', 'photo'], bref: ['📄 Avis médical', '📄 Décision de suspension', '🪪 Identité, domicile, photo', '📅 10 jours avant la fin au plus tôt'], info: 'Cocher « demande à la suite d’une suspension ». Avec l’avis médical, la décision de suspension, la pièce d’identité, un justificatif de domicile de moins de 6 mois et la photo-signature. Au plus tôt 10 jours avant la fin. ' + lien('antsSusp', 'Demande ANTS') });
    out.push({ cle: 'lecons', t: 'Leçons de reprise (si il le veut)', qui: 'nous', facultatif: true, heures: true, bref: ['Facultatif'] });
    out.push({ cle: 'recu', t: 'Permis récupéré : regarder sa durée', qui: 'eleve', bref: ['⏳ 6 mois ou 1 an : nouvelle visite à la fin'], info: 'Le nouveau permis peut être limité à 6 mois ou 1 an : il faudra repasser le contrôle médical à la fin.' });
    return out;
  }
  /* annulation / invalidation */
  const r = regleAnnul(d);
  const commission = d.motif === 'alcool' || d.motif === 'stups';
  const quand = d.type === 'invalidation' ? 'Possible avant la fin de l’interdiction.' : 'Seulement après la fin de l’interdiction.';
  const papierDecision = d.type === 'invalidation' ? ['l48', 'ref44'] : ['ref7'];
  const out = [{ cle: 'infos', t: 'Décision notée (type, date, ancienneté du permis)', qui: 'nous', docs: papierDecision,
      bref: ['📅 Fin d’interdiction', '📘 Code seul ou code + conduite', d.type === 'invalidation' ? '🧾 Lettre 48SI + référence 44' : '⚖️ Référence 7'],
      info: d.type === 'invalidation' ? 'Garder la lettre 48SI et la référence 44 (récépissé remis quand il rend son permis) : elles servent à l’inscription.' : 'Garder la référence 7 (le jugement remis par le tribunal) : elle sert à l’inscription et à la demande du permis.' },
    { cle: 'psy', t: 'Examen psychotechnique', qui: 'eleve', bref: ['💶 Environ 100 €', d.type === 'invalidation' ? '📅 Avant la fin possible' : '📅 Après la fin'], info: 'Obligatoire après une ' + (d.type === 'invalidation' ? 'invalidation' : 'annulation') + '. Environ 100 €. ' + quand + ' Le résultat est personnel : nous n’y avons pas accès, l’élève nous dit quand c’est fait.' },
    { cle: 'visite', t: commission ? 'Commission médicale (préfecture de Saint-Brieuc)' : 'Visite chez un médecin agréé', qui: commission ? 'pref' : 'eleve', docs: ['avis'],
      bref: (commission ? ['🍷 Alcool ou stupéfiants', '💶 50 €'] : ['💶 36 €']).concat([d.type === 'invalidation' ? '📅 Avant la fin possible' : '📅 Après la fin']),
      info: (commission ? 'Alcool ou stupéfiants : 50 €, sur rendez-vous. ' + lien('rdvPref', 'Rendez-vous préfecture') : '36 €. ' + lien('medecins', 'Médecins agréés (22)')) + ' ' + quand },
    { cle: 'ants', t: 'Inscription ANTS à l’examen (nous pouvons la faire)', qui: 'nous', docs: [d.type === 'invalidation' ? 'ref44' : 'ref7', 'avis', 'ci', 'domicile', 'photo'], bref: r.codeSeul ? ['📌 Dans les 9 mois ' + (d.type === 'invalidation' ? 'après la remise du permis' : 'après la fin de l’interdiction'), '⚠️ Sinon : code + conduite', '📄 Avis médical joint'] : ['📄 Avis médical joint'], info: (r.codeSeul ? 'Avant le ' + frDate(r.limite) + ' pour ne repasser que le code : après cette date, il repasse le code et la conduite. ' : (r.rate ? '⚠️ Les 9 mois sont passés : il repasse le code et la conduite. ' : '')) + 'Avec l’avis médical. ' + lien('antsAnnulInscr', 'Inscription ANTS') },
    { cle: 'code', t: 'Examen du code (ETG)', qui: 'eleve' }];
  if(!r.codeSeul) out.push({ cle: 'eval', t: 'Évaluation à l’école', qui: 'nous', heures: true }, { cle: 'conduite', t: 'Leçons de conduite', qui: 'nous' },
    { cle: 'examenC', t: 'Examen de conduite', qui: 'nous', rdv: true });
  out.push({ cle: 'titre', t: 'Demande du permis sur l’ANTS à la fin de l’interdiction', qui: 'nous', bref: ['📅 Pas avant la fin', d.type === 'invalidation' ? '📄 Avis médical, identité, domicile, photo' : '⚖️ Jugement + avis médical, identité, domicile, photo'], info: 'Nous pouvons la faire. ' + (d.type === 'invalidation' ? '' : 'Avec le jugement (référence 7). ') + lien('antsAnnulTitre', 'Demande ANTS') });
  return out;
}

/* les codes sont tous de ceux que le médecin agréé pose seul ? */
function codesSansInspecteur(d){ const c = d.codes || []; return c.length > 0 && c.every(cd => CODE[cd] && CODE[cd].seul); }

/* Code seul ou code + conduite (service-public F1704, F21774) :
   permis depuis 3 ans ou plus, interdiction de moins d'un an, inscription
   dans les 9 mois — après la remise du permis (invalidation) ou après la
   fin de l'interdiction (annulation). */
function regleAnnul(d){
  let fin = d.finInterdiction || '';
  if(d.type === 'invalidation' && d.remise) fin = plusMois(d.remise, d.dejaInvalide ? 12 : 6);
  const moinsUnAn = d.type === 'invalidation' ? !d.dejaInvalide : !!d.moinsUnAn;
  const droitCodeSeul = !!d.troisAns && moinsUnAn;
  const depart = d.type === 'invalidation' ? (d.remise || '') : fin;
  const limite = droitCodeSeul && depart ? plusMois(depart, 9) : '';
  /* les 9 mois passés sans inscription ANTS : il repasse tout */
  const rate = !!limite && jours(limite) < 0 && !((d.fait || {}).ants && (d.fait || {}).ants !== 'non');
  const codeSeul = droitCodeSeul && !rate;
  return { fin: fin, codeSeul: codeSeul, limite: limite, rate: rate,
    texte: rate ? 'Code et conduite : l’inscription n’a pas été faite dans les 9 mois (avant le ' + frDate(limite) + ')'
      : (codeSeul ? 'Code seul (permis depuis 3 ans ou plus, interdiction de moins d’un an), à condition de s’inscrire avant le ' + (frDate(limite) || '…') + ' ; sinon, code et conduite'
                  : 'Code et conduite') };
}

const DOCS = { avis: '📄 Avis médical (cerfa 14880)', trestel: '🏥 Résumé Trestel', ci: '🪪 Carte d’identité', permis: '🚗 Permis', codif: '📑 Attestation de codification',   decision: '📄 Décision de suspension (arrêté 3F ou 1F de la préfecture, ou jugement réf. 72)', ref7: '⚖️ Référence 7 : le jugement d’annulation remis par le tribunal', l48: '✉️ Lettre 48SI (solde de points nul)', ref44: '🧾 Référence 44 : récépissé de remise du permis',
  domicile: '🏠 Justificatif de domicile (moins de 6 mois)', photo: '📷 Photo-signature numérique (e-photo)',
  eval: '📋 Fiche d’évaluation handicap (PDF)' };

/* ---------- les dossiers, lus dans D1 (demarchesLire) ---------- */
let DOSSIERS = [];
let DM_ADMIN = false;
let dmCharge = 0, dmEnCours = null;

/* Un dossier du Worker, à plat pour l'écran */
function versLocal(x){
  const d = Object.assign({}, (x && x.donnees) || {});
  d.id = x.id; d.eleve = x.eleve; d.parcours = x.parcours;
  d.majLe = x.majLe || ''; d.par = x.par || ''; d.creeLe = x.creeLe || '';
  d.fait = (d.fait && typeof d.fait === 'object') ? d.fait : {};
  d.docs = (d.docs && typeof d.docs === 'object') ? d.docs : {};
  d.codes = Array.isArray(d.codes) ? d.codes : [];
  d.situations = Array.isArray(d.situations) ? d.situations : [];
  d.envois = Array.isArray(d.envois) ? d.envois : [];
  return d;
}
/* Ce qui part au Worker : ni l'identité (envoyée à part), ni les papiers
   ni les envois — le Worker garde les siens (voir demarchesPoser) */
const HORS_DONNEES = ['id', 'eleve', 'parcours', 'majLe', 'par', 'creeLe', 'docs', 'envois', '__assistant'];
function versServeur(d){
  const o = {};
  Object.keys(d).forEach(k => { if(HORS_DONNEES.indexOf(k) === -1) o[k] = d[k]; });
  return o;
}
function prendreDossier(x){
  if(!x || !x.id) return null;
  const d = versLocal(x);
  const i = DOSSIERS.findIndex(y => y.id === d.id);
  if(i >= 0) DOSSIERS[i] = d; else DOSSIERS.unshift(d);
  return d;
}
async function appelDM(o){
  const r = await appelPrep(o);
  if(r && r.status === 'error') throw new Error(r.message || 'Refusé');
  return r || {};
}

/* Une seule lecture pour les trois écrans (les deux cartes, le dossier
   de l'élève, les cartes de cours), gardée cinq minutes */
async function chargerDemarches(forcer){
  if(!forcer && dmCharge && Date.now() - dmCharge < 300000) return DOSSIERS;
  if(dmEnCours) return dmEnCours;
  dmEnCours = (async () => {
    try{
      const r = await appelDM({ action: 'demarchesLire' });
      DOSSIERS = (r.dossiers || []).map(versLocal);
      LISTE_MEDECINS = r.listeMedecins || null;
      DM_ADMIN = !!r.admin;
      dmCharge = Date.now();
    }finally{
      dmEnCours = null;
    }
    return DOSSIERS;
  })();
  return dmEnCours;
}

/* Enregistrer : l'écran a déjà changé, le Worker suit. Un refus
   recharge tout : l'écran ne doit pas montrer ce qui n'est pas écrit. */
async function enregistrer(d, dire){
  try{
    const r = await appelDM({ action: 'demarchesPoser', id: d.id || '', eleve: d.eleve, parcours: d.parcours, donnees: versServeur(d) });
    const n = prendreDossier(r.dossier);
    if(dire) showToast(dire);
    return n;
  }catch(e){
    showToast('⚠️ Pas enregistré : ' + e.message);
    try{ await chargerDemarches(true); }catch(x){ /* l'écran garde ce qu'il a */ }
    dessiner();
    return null;
  }
}

/* Un fichier choisi, en « data: » pour le Worker (10 Mo au plus) */
function lireFichierDM(f){
  return new Promise((ok, ko) => {
    if(f.size > 10 * 1024 * 1024){ ko(new Error('10 Mo au plus')); return; }
    const r = new FileReader();
    r.onload = () => ok(r.result);
    r.onerror = () => ko(new Error('Lecture impossible'));
    r.readAsDataURL(f);
  });
}
function choisirFichierDM(accept){
  return new Promise(ok => {
    const i = document.createElement('input');
    i.type = 'file'; i.accept = accept || 'application/pdf,image/jpeg,image/png,image/webp';
    i.style.display = 'none';
    i.addEventListener('change', () => { const f = i.files && i.files[0]; i.remove(); ok(f || null); });
    document.body.appendChild(i);
    i.click();
  });
}
async function ouvrirLienDM(o){
  try{
    const r = await appelDM(Object.assign({ action: 'demarchesPieceLien' }, o));
    if(r.lien) window.open(/^https?:/.test(r.lien) ? r.lien : CONFIG.WORKER_URL + r.lien, '_blank', 'noopener');
  }catch(e){ showToast('Impossible : ' + e.message); }
}

/* ---------- où en est un dossier ---------- */
function etat(d){
  const et = etapesDe(d);
  const faites = et.filter(e => (d.fait || {})[e.cle]);
  const suivante = et.find(e => !(d.fait || {})[e.cle] && !(e.facultatif && (d.fait || {})[e.cle] === 'non'));
  const alertes = [];
  if(d.visiteDate){ const fin = plusMois(d.visiteDate, 24); const j = jours(fin); if(j < 90) alertes.push('⚠️ Avis médical valable jusqu’au ' + frDate(fin)); }
  if(d.parcours === 'susp' && d.fin){ const j = jours(d.fin); alertes.push((j < 35 ? '⏰ ' : '') + 'Fin de suspension le ' + frDate(d.fin) + (j >= 0 ? ' (dans ' + j + ' j)' : '')); }
  if(d.parcours === 'annul'){ const r = regleAnnul(d); if(r.fin) alertes.push('Fin d’interdiction le ' + frDate(r.fin)); if(r.limite) alertes.push('📌 S’inscrire avant le ' + frDate(r.limite) + ' (code seul)'); }
  return { et: et, faites: faites.length, total: et.filter(e => !e.facultatif).length, suivante: suivante };
}

/* ============================================================
   L'ÉCRAN
   ============================================================ */
let vue = 'dossiers', filtre = 'tout', ouvert = null, cherche = '';
let zoneRacine = null;
/* dans le dossier de l'élève : son nom, et ce que fait « ← » */
let contexteEleve = null, retourDuDossier = null;

function pastille(texte, actif, attr){
  return '<button type="button" ' + (attr || '') + ' style="width:auto;margin:0;padding:7px 12px;font-size:13px;border-radius:999px;font-weight:700;' +
    (actif ? 'background:var(--orange-soft);border:1px solid var(--orange);color:var(--on-accent);' : '') + '" class="' + (actif ? '' : 'btn btn-secondary') + '">' + texte + '</button>';
}

function dessiner(){
  const z = zoneRacine;
  if(!z) return;
  const o = ouvert ? DOSSIERS.find(x => x.id === ouvert) : null;
  if(o){ dessinerDossier(z, o); return; }
  ouvert = null;
  /* le dossier de l'élève n'a pas les onglets de l'écran : sa liste à lui */
  if(contexteEleve){ if(retourDuDossier) retourDuDossier(); return; }
  const onglets = outil === 'handicap'
    ? [['dossiers', '📂 Dossiers'], ['bref', '🗺️ En bref'], ['codes', '⚡ Codes'], ['maladies', '🔍 Maladies et conduite'], ['contacts', '📇 Contacts']]
    : [['dossiers', '📂 Dossiers'], ['bref', '🗺️ En bref'], ['contacts', '📇 Contacts']];
  z.innerHTML = '<div id="dmOnglets" style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:14px;">' +
    onglets.map(([k, t]) => pastille(t, vue === k, 'data-dmvue="' + k + '"')).join('') + '</div><div id="dmCorps"></div>';
  z.querySelectorAll('[data-dmvue]').forEach(b => b.addEventListener('click', () => { vue = b.dataset.dmvue; dessiner(); }));
  const c = $('#dmCorps', z);
  if(vue === 'dossiers') dessinerListe(c);
  else if(vue === 'bref') dessinerEnBref(c);
  else if(vue === 'codes') dessinerCodes(c, null);
  else if(vue === 'maladies') dessinerMaladies(c, null);
  else dessinerContacts(c);
}

function dessinerListe(c){
  const attente = DOSSIERS.filter(duOutil).map(d => ({ d: d, e: etat(d) })).filter(x => x.e.suivante && x.e.suivante.qui === 'nous');
  let h = '';
  if(attente.length){
    h += '<details open style="border:1px solid var(--orange);border-radius:12px;padding:10px 12px;margin-bottom:12px;">' +
      '<summary style="cursor:pointer;font-size:13px;font-weight:700;color:var(--accent-text);">🏫 ' + attente.length + ' dossier(s) attendent quelque chose de nous</summary><div style="margin-top:10px;">' +
      attente.map(x => '<div data-dmouvrir="' + x.d.id + '" style="font-size:13px;line-height:1.5;padding:5px 0;cursor:pointer;"><strong>' + esc(x.d.eleve) + '</strong> — <span style="color:var(--muted);">' + esc(x.e.suivante.t) + '</span></div>').join('') + '</div></details>';
  }
  h += '<button class="btn btn-secondary" id="dmNouveau" style="margin-bottom:10px;padding:12px;font-size:13px;">➕ Nouveau dossier</button>';
  h += '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">' +
    [['tout', 'Tout']].concat(OUTILS[outil].parcours.map(k => [k, PARCOURS[k].em + ' ' + PARCOURS[k].t]))
      .map(([k, t]) => pastille(t + ' ' + (k === 'tout' ? DOSSIERS.filter(duOutil).length : DOSSIERS.filter(d => d.parcours === k).length), filtre === k, 'data-dmfiltre="' + k + '"')).join('') + '</div>';
  h += '<input type="search" id="dmCherche" placeholder="' + (outil === 'handicap' ? '🔍 Nom, maladie, code…' : '🔍 Nom…') + '" value="' + esc(cherche) + '" style="margin-bottom:10px;font-size:14px;">';
  const mots = cherche.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/\s+/).filter(Boolean);
  const liste = DOSSIERS.filter(duOutil).filter(d => filtre === 'tout' || d.parcours === filtre).filter(d => {
    if(!mots.length) return true;
    const m = MALADIES.find(x => x.id === d.maladie);
    const tout = [d.eleve, m ? m.t : '', (d.codes || []).join(' '), PARCOURS[d.parcours].t].join(' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return mots.every(w => tout.indexOf(w) !== -1);
  });
  h += liste.map(d => {
    const e = etat(d); const p = PARCOURS[d.parcours];
    const pct = Math.round(100 * e.faites / Math.max(1, e.et.length));
    const q = e.suivante ? QUI[e.suivante.qui] : null;
    return '<div data-dmouvrir="' + d.id + '" style="border:1px solid var(--line);border-radius:11px;padding:10px 12px;margin-bottom:8px;cursor:pointer;">' +
      '<div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;"><strong style="font-size:15px;color:var(--cream);">' + p.em + ' ' + esc(d.eleve) + '</strong>' +
      '<span style="font-size:11px;color:var(--muted);">' + esc(p.t) + ' · ' + e.faites + '/' + e.et.length + '</span>' +
      ((d.codes || []).length ? '<span style="font-size:11px;color:var(--accent-text);font-weight:700;">' + esc(d.codes.join(' · ')) + '</span>' : '') + '</div>' +
      '<div style="height:5px;border-radius:3px;background:var(--line);margin:8px 0 6px;overflow:hidden;"><div style="height:100%;width:' + pct + '%;background:var(--orange);"></div></div>' +
      (e.suivante ? '<div style="font-size:13px;">➡️ ' + esc(e.suivante.t) + ' <span style="font-size:11px;color:var(--muted);">· ' + q[0] + ' ' + q[1] + '</span></div>' : '<div style="font-size:13px;">✅ Dossier terminé</div>') +
      etatAlertes(d) + noteCourte(d) + '</div>';
  }).join('') || '<div class="empty">Aucun dossier.</div>';
  c.innerHTML = h;
  c.querySelectorAll('[data-dmouvrir]').forEach(x => x.addEventListener('click', () => { ouvert = x.dataset.dmouvrir; dessiner(); window.scrollTo && zoneRacine.scrollIntoView({ block: 'start' }); }));
  c.querySelectorAll('[data-dmfiltre]').forEach(b => b.addEventListener('click', () => { filtre = b.dataset.dmfiltre; dessiner(); }));
  $('#dmNouveau', c).addEventListener('click', () => assistant());
  const ch = $('#dmCherche', c);
  ch.addEventListener('input', () => { cherche = ch.value; const pos = ch.selectionStart; dessiner(); const n = $('#dmCherche', zoneRacine); if(n){ n.focus(); n.setSelectionRange(pos, pos); } });
}
/* 📝 la première ligne des notes internes, sous la carte du dossier */
function noteCourte(d){
  const l = String(d.notes || '').trim().split('\n')[0];
  return l ? '<div style="font-size:12px;color:var(--muted);margin-top:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">📝 ' + esc(l) + '</div>' : '';
}
function etatAlertes(d){
  const a = [];
  if(d.visiteDate){ const fin = plusMois(d.visiteDate, 24); if(jours(fin) < 90) a.push('⚠️ Avis médical jusqu’au ' + frDate(fin)); }
  if(d.parcours === 'susp' && d.fin) a.push('⏰ Fin de suspension le ' + frDate(d.fin));
  if(d.parcours === 'annul'){ const r = regleAnnul(d); if(r.rate) a.push('⚠️ 9 mois dépassés : code + conduite'); else if(r.codeSeul && r.limite && !(d.fait || {}).ants) a.push('📌 Inscription avant le ' + frDate(r.limite) + ' (sinon code + conduite)'); }
  const st = (d.parcours === 'regul') && !(d.docs && d.docs.avis && d.docs.ci && d.docs.permis) && (d.fait || {}).planning ? ['📑 Pièces DDTM incomplètes'] : [];
  return a.concat(st).length ? '<div style="font-size:11.5px;color:var(--accent-text);margin-top:5px;font-weight:700;">' + a.concat(st).map(esc).join(' · ') + '</div>' : '';
}

/* ---------- un dossier ---------- */
function dessinerDossier(z, d){
  const e = etat(d); const p = PARCOURS[d.parcours];
  const m = MALADIES.find(x => x.id === d.maladie);
  let h = '<div style="display:flex;gap:10px;align-items:center;margin-bottom:12px;flex-wrap:wrap;">' +
    '<button class="btn btn-secondary" id="dmRetour" style="width:auto;margin:0;padding:8px 13px;font-size:14px;">←</button>' +
    '<div style="flex:1;min-width:0;"><div style="font-size:17px;font-weight:800;color:var(--cream);">' + p.em + ' ' + esc(d.eleve) + '</div>' +
    '<div style="font-size:12px;color:var(--muted);">' + esc(p.t) + ' · ' + e.faites + '/' + e.et.length + ' étapes' + (m ? ' · ' + esc(m.t) : '') + '</div></div></div>';
  /* 📝 v1567 — LES NOTES EN HAUT DU DOSSIER. David, le 25/11 : « laisse un
     espace de texte libre en haut, pour qu'on puisse écrire ce qu'on veut,
     du style des notes internes » ; en haut de chaque dossier, permis
     aménagé comme suspension · annulation. Pour l'équipe seulement :
     elles ne partent jamais dans le message à l'élève. */
  h += '<div style="border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin-bottom:12px;background:var(--navy-deep);box-shadow:var(--ombre-carte);">' +
    '<label for="dmNotes" style="display:block;font-size:13px;font-weight:700;color:var(--accent-text);margin:0 0 6px;text-transform:none;letter-spacing:0;">📝 Notes internes</label>' +
    '<textarea id="dmNotes" rows="3" maxlength="4000" style="width:100%;box-sizing:border-box;margin:0;font-family:inherit;font-size:14px;line-height:1.5;color:var(--cream);" placeholder="Écris ce que tu veux… Ça reste dans l’équipe : l’élève ne le voit jamais.">' + esc(d.notes || '') + '</textarea></div>';
  if(e.suivante){
    const q = QUI[e.suivante.qui];
    h += '<div style="border:1px solid var(--orange);background:var(--orange-soft);color:var(--on-accent);border-radius:12px;padding:11px 13px;margin-bottom:12px;font-size:14px;">' +
      '<div style="font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;opacity:.75;">Prochaine étape · ' + q[0] + ' ' + q[1] + '</div><b>' + esc(e.suivante.t) + '</b></div>';
  }
  const al = etatAlertes(d); if(al) h += al.replace('margin-top:5px', 'margin:0 0 10px');
  /* les infos du parcours suspension / annulation */
  if(d.parcours === 'annul'){ const r = regleAnnul(d); h += boite('⛔ Ce qu’il repasse', '<b>' + esc(r.texte) + '</b>' + (r.fin ? '<br>Fin d’interdiction : ' + frDate(r.fin) : '') + '<br><span style="font-size:12px;color:var(--muted);">' + (d.type === 'invalidation' ? 'Invalidation (0 point) : 6 mois, ou 1 an si déjà invalidé dans les 5 ans. ' + lien('invalid', 'F1704') : 'Annulation par le juge. ' + lien('annul', 'F21774')) + '</span>'); }
  if(d.parcours === 'susp') h += boite('⏸️ Sa suspension', d.mois + ' mois · motif : ' + esc({ alcool: 'alcool', stups: 'stupéfiants', vitesse: 'vitesse', autre: 'autre' }[d.motif] || '—') + (d.fin ? ' · fin le ' + frDate(d.fin) : '') + '<br><span style="font-size:12px;color:var(--muted);">' + (d.mois <= 1 ? 'Rien à repasser, pas de visite.' : 'Ni code ni conduite à repasser, même pour plus de 6 mois. Visite médicale' + (d.mois >= 6 ? ' et tests psychotechniques' : '') + ' avant de récupérer le permis.') + ' ' + lien('susp', 'F14836') + '</span>');
  if(d.parcours === 'regul' || d.parcours === 'premier'){
    /* 🔍 v1568 — un dossier ouvert tout seul par la formation n'a pas encore
       sa maladie : elle se choisit ici, comme dans ➕ Nouveau dossier */
    h += boite('🔍 Sa maladie ou son handicap', (m ? '<b>' + esc(m.t) + '</b> <span style="font-size:12.5px;font-weight:800;color:' + ST[m.s].c + ';">' + ST[m.s].t + '</span>'
        : '<span style="color:var(--muted);font-size:13px;">Pas encore notée.</span>') +
      '<button class="btn btn-secondary" id="dmMaladie" style="width:auto;margin:8px 0 0;padding:7px 12px;font-size:12.5px;display:block;">' + (m ? '🔁 Changer' : '🔍 La choisir dans la liste') + '</button>');
    h += boite('🩺 Codes du médecin agréé', ((d.codes || []).length
      ? d.codes.map(cd => '<span style="display:inline-block;margin:0 6px 6px 0;padding:4px 9px;border-radius:999px;border:1px solid var(--line);font-size:12.5px;"><b>' + cd + '</b> ' + esc((CODE[cd] || {}).n || '') + (CODE[cd] && CODE[cd].seul ? '' : ' <span title="Regardé en conduite par l’inspecteur">🚗</span>') + badgeVoiture(cd) + '</span>').join('') +
        (pasChezNous(d.codes).length ? '<div style="font-size:12.5px;color:#E5484D;font-weight:700;margin-bottom:4px;">✖️ Pas sur notre voiture : ' + pasChezNous(d.codes).join(', ') + '</div>' : '') +
        (aVoir(d.codes).length ? '<div style="font-size:12.5px;margin-bottom:4px;">❓ ' + aVoir(d.codes).join(', ') + ' : selon les codes du médecin, la formation est sans doute possible.</div>' : '') +
        '<div style="font-size:11.5px;color:var(--muted);">🩺 C’est le médecin agréé qui donne les codes, sur l’avis médical. ' + (d.codes.some(cd => CODE[cd] && !CODE[cd].seul) ? '🚗 = aménagement que l’inspecteur regarde en conduite (régularisation ou examen).' : 'Ici, aucun passage devant l’inspecteur.') + '</div>'
      : '<span style="color:var(--muted);font-size:13px;">Aucun code prévu.</span>') + '<button class="btn btn-secondary" id="dmCodes" style="width:auto;margin:8px 0 0;padding:7px 12px;font-size:12.5px;">⚡ Chercher ou ajouter un code</button>');
  }
  /* les étapes */
  h += '<div style="margin:10px 0;">' + e.et.map((et, i) => ligneEtape(d, et, i)).join('') + '</div>';
  /* ses papiers (le résultat de l'examen psychotechnique n'y est jamais : il est personnel) */
  const besoin = Array.from(new Set(e.et.flatMap(x => x.docs || [])));
  if(besoin.length) h += boite('📎 Ses papiers', besoin.map(k => {
    const p2 = d.docs[k];
    return '<div style="display:flex;align-items:center;gap:8px;padding:5px 0;font-size:13.5px;flex-wrap:wrap;">' +
      '<span style="flex:1;min-width:160px;">' + DOCS[k] + '</span>' +
      (p2 ? '<button type="button" class="btn btn-secondary" data-dmvoir="' + k + '" style="width:auto;margin:0;padding:5px 10px;font-size:12px;" title="' + esc('Déposé le ' + frDate(p2.le) + (p2.par ? ' par ' + p2.par : '')) + '">✅ ' + esc(p2.nom.length > 28 ? p2.nom.slice(0, 26) + '…' : p2.nom) + '</button>' +
            '<button type="button" class="btn btn-secondary" data-dmdoc="' + k + '" style="width:auto;margin:0;padding:5px 9px;font-size:12px;" title="Remplacer">🔁</button>' +
            '<button type="button" class="btn btn-secondary" data-dmretirer="' + k + '" style="width:auto;margin:0;padding:5px 9px;font-size:12px;" title="Retirer">✕</button>'
          : '<button type="button" class="btn btn-secondary" data-dmdoc="' + k + '" style="width:auto;margin:0;padding:5px 10px;font-size:12px;">＋ Déposer</button>') + '</div>';
  }).join('') + '<div style="font-size:11.5px;color:var(--muted);margin-top:4px;">PDF ou photo, 10 Mo au plus.</div>');
  if(d.reprisDe) h += '<div style="font-size:11.5px;color:var(--muted);margin-top:4px;">↪️ Repris du classeur (' + esc(d.reprisDe) + ') : les étapes cochées là-bas sont « faites » sans date ; à vérifier.</div>';
  h += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px;">' +
    '<button class="btn btn-primary" id="dmMail" style="flex:1;min-width:180px;margin:0;">✉️ Lui envoyer où il en est</button>' +
    '<button class="btn btn-secondary" id="dmMsg" style="flex:1;min-width:160px;margin:0;">💬 Par la messagerie</button></div>';
  if((d.envois || []).length) h += '<div style="font-size:12px;color:var(--muted);margin-top:8px;">📤 Déjà envoyé : ' +
    d.envois.slice(-4).reverse().map(x => (x.canal === 'messagerie' ? '💬 ' : '✉️ ') + frDate(x.le) + (x.par ? ' (' + esc(x.par) + ')' : '')).join(' · ') + '</div>';
  h += '<div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-top:14px;font-size:11.5px;color:var(--muted);">' +
    '<span>' + (d.majLe ? 'Modifié le ' + esc(String(d.majLe).slice(0, 16)) + (d.par ? ' par ' + esc(d.par) : '') : '') + '</span>' +
    '<button type="button" class="btn btn-secondary" id="dmSuppr" style="width:auto;margin:0;padding:6px 11px;font-size:12px;">🗑️ Supprimer ce dossier</button></div>';
  z.innerHTML = h;
  $('#dmRetour', z).addEventListener('click', () => { ouvert = null; if(retourDuDossier) retourDuDossier(); else dessiner(); });
  const bc = $('#dmCodes', z); if(bc) bc.addEventListener('click', () => fenetreCodes(d));
  const bm = $('#dmMaladie', z); if(bm) bm.addEventListener('click', () => {
    const b = fenetre('🔍 Sa maladie · ' + d.eleve);
    dessinerMaladies(b, (id) => {
      d.maladie = id; d.fait = d.fait || {};
      if(!d.fait.maladie || d.fait.maladie === 'non') d.fait.maladie = aujourdHui();
      fermerFenetre(); dessiner(); enregistrer(d, '🔍 Maladie notée');
    });
  });
  const fe = $('#dmFicheEval', z); if(fe) fe.addEventListener('click', () => faireLaFicheEval(d));
  z.querySelectorAll('[data-dmdoc]').forEach(b => b.addEventListener('click', async () => {
    const f = await choisirFichierDM();
    if(!f) return;
    b.disabled = true; b.textContent = 'Envoi…';
    try{
      const fichier = await lireFichierDM(f);
      const r = await appelDM({ action: 'demarchesPiece', id: d.id, doc: b.dataset.dmdoc, fichier: fichier, nom: f.name });
      prendreDossier(r.dossier);
      showToast('📎 Rangé dans son dossier ✅');
    }catch(e){ showToast('Impossible : ' + e.message); }
    dessiner();
  }));
  z.querySelectorAll('[data-dmvoir]').forEach(b => b.addEventListener('click', () => ouvrirLienDM({ id: d.id, doc: b.dataset.dmvoir })));
  z.querySelectorAll('[data-dmretirer]').forEach(b => b.addEventListener('click', async () => {
    if(!(await confirmer('Retirer « ' + DOCS[b.dataset.dmretirer].replace(/^\S+\s/, '') + ' » de son dossier ?', 'Retirer un papier', true))) return;
    try{
      const r = await appelDM({ action: 'demarchesPiece', id: d.id, doc: b.dataset.dmretirer, retirer: true });
      prendreDossier(r.dossier);
    }catch(e){ showToast('Impossible : ' + e.message); }
    dessiner();
  }));
  z.querySelectorAll('[data-dmetat]').forEach(s => s.addEventListener('change', async () => {
    const k = s.dataset.dmetat; d.fait = d.fait || {};
    if(s.value === 'fait') d.fait[k] = aujourdHui(); else if(s.value === 'non') d.fait[k] = 'non'; else delete d.fait[k];
    if(k === 'visite' && s.value === 'fait') d.visiteDate = aujourdHui();
    dessiner();
    const n = await enregistrer(d);
    /* une étape faite : le message est proposé, il part sur « Envoyer » (David) */
    if(n && s.value === 'fait' && ouvert === n.id) setTimeout(() => proposerLeMessage(n), 250);
  }));
  z.querySelectorAll('[data-dmheures]').forEach(i => i.addEventListener('change', () => { d.heures = Number(i.value) || 0; enregistrer(d); }));
  z.querySelectorAll('[data-dmrdv]').forEach(i => i.addEventListener('change', () => { d.rdv = i.value; enregistrer(d); }));
  const notes = $('#dmNotes', z);
  notes.addEventListener('input', () => { d.notes = notes.value; });
  notes.addEventListener('change', () => { d.notes = notes.value; enregistrer(d, '📝 Notes enregistrées'); });
  $('#dmMail', z).addEventListener('click', () => fenetreMail(d, 'mail'));
  $('#dmMsg', z).addEventListener('click', () => fenetreMail(d, 'msg'));
  $('#dmSuppr', z).addEventListener('click', async () => {
    if(!(await confirmer('Supprimer le dossier de ' + d.eleve + ' (' + PARCOURS[d.parcours].t.toLowerCase() + ') et ses papiers ? Cela ne se rattrape pas.', 'Supprimer le dossier', true))) return;
    try{
      await appelDM({ action: 'demarchesSupprimer', id: d.id });
      DOSSIERS = DOSSIERS.filter(x => x.id !== d.id);
      ouvert = null;
      showToast('🗑️ Dossier supprimé');
      if(retourDuDossier) retourDuDossier(); else dessiner();
    }catch(e){ showToast('Impossible : ' + e.message); }
  });
}
/* Le message proposé quand une étape est faite, et qu'il reste
   quelque chose que l'élève doit savoir */
async function proposerLeMessage(d){
  const e = etat(d);
  if(!e.suivante) return;
  if(await confirmer('Étape notée ✅. Lui envoyer où il en est ? Le message est prêt, tu le reliras avant qu’il parte.', '✉️ Prévenir ' + d.eleve)) fenetreMail(d, 'mail');
}
/* 📋 La fiche d'évaluation handicap des bilans (🚗 Cours, modèle
   « handicap »), l'élève déjà choisi */
function faireLaFicheEval(d){
  if(typeof afficherOnglet === 'function') afficherOnglet('cours', true);
  if(typeof afficherVue === 'function') afficherVue('cours', 'cours');
  setTimeout(() => {
    const m = document.getElementById('modele');
    if(m && Array.prototype.some.call(m.options || [], o => o.value === 'handicap')){
      m.value = 'handicap';
      if(typeof adapterAuModele === 'function') adapterAuModele();
    }
    const n = document.getElementById('studentName');
    if(n){ n.value = d.eleve; n.dispatchEvent(new Event('input', { bubbles: true })); n.dispatchEvent(new Event('change', { bubbles: true })); }
    showToast('📋 Fiche d’évaluation handicap : son PDF se dépose ensuite dans son dossier');
  }, 150);
}
function boite(titre, corps){
  return '<div style="border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin-bottom:10px;"><div style="font-size:11px;color:var(--muted);font-weight:800;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px;">' + titre + '</div><div style="font-size:14px;line-height:1.55;">' + corps + '</div></div>';
}
function ligneEtape(d, et, i){
  const v = (d.fait || {})[et.cle];
  const fait = v && v !== 'non';
  /* 🔒 le rendez-vous DDTM attend l'avis, la carte d'identité et le permis
     (David) : déposés ici, ou l'étape « Pièces » passée à Fait */
  const piecesOk = (d.docs.avis && d.docs.ci && d.docs.permis) || ((d.fait || {}).pieces && (d.fait || {}).pieces !== 'non');
  const bloque = et.bloquePar && !piecesOk;
  const q = QUI[et.qui];
  const icone = fait ? '✅' : (v === 'non' ? '➖' : (bloque ? '🔒' : '⬜'));
  let h = '<div style="display:flex;gap:10px;padding:9px 0;border-top:1px solid var(--line);' + (v === 'non' ? 'opacity:.55;' : '') + '">' +
    '<div style="font-size:18px;line-height:1.2;flex-shrink:0;width:22px;text-align:center;">' + icone + '</div><div style="flex:1;min-width:0;">' +
    '<div style="font-size:14px;font-weight:700;color:var(--cream);">' + esc(et.t) + (et.facultatif ? ' <span style="font-size:11px;font-weight:400;color:var(--muted);">(facultatif)</span>' : '') + '</div>' +
    '<div style="font-size:11.5px;color:var(--muted);margin-top:2px;">' + q[0] + ' ' + q[1] + (fait ? (frDate(v) ? ' · fait le ' + frDate(v) : ' · fait') : '') + '</div>';
  if(et.info) h += '<div style="font-size:12.5px;line-height:1.5;margin-top:4px;color:var(--cream);opacity:.85;">' + et.info + '</div>';
  if(bloque && !fait) h += '<div style="font-size:12.5px;margin-top:4px;color:var(--red);font-weight:700;">🔒 Il manque : ' + ['avis', 'ci', 'permis'].filter(k => !d.docs[k]).map(k => DOCS[k]).join(', ') + ' (à déposer, ou « Pièces » à Fait)</div>';
  if(et.ficheEval) h += '<button type="button" class="btn btn-secondary" id="dmFicheEval" style="width:auto;margin:6px 0 0;padding:6px 11px;font-size:12.5px;">📋 Faire sa fiche d’évaluation handicap</button>';
  if(et.heures) h += '<div style="display:flex;align-items:center;gap:8px;margin-top:6px;font-size:13px;">Heures proposées <input type="number" min="0" data-dmheures="1" value="' + esc(d.heures || '') + '" style="width:80px;margin:0;padding:6px 8px;"></div>';
  if(et.rdv) h += '<div style="display:flex;align-items:center;gap:8px;margin-top:6px;font-size:13px;">Date <input type="datetime-local" data-dmrdv="1" value="' + esc(d.rdv || '') + '" style="width:auto;margin:0;padding:6px 8px;"' + (bloque ? ' disabled' : '') + '></div>';
  h += '</div><select data-dmetat="' + et.cle + '" style="width:auto;margin:0;padding:6px 8px;font-size:12.5px;align-self:flex-start;"' + (bloque && !fait ? ' disabled' : '') + '>' +
    '<option value="">À faire</option><option value="fait"' + (fait ? ' selected' : '') + '>Fait</option>' + (et.facultatif ? '<option value="non"' + (v === 'non' ? ' selected' : '') + '>Pas nécessaire</option>' : '') + '</select></div>';
  return h;
}

/* ---------- ⚡ codes ---------- */
function dessinerCodes(c, dossier){
  const sel = new Set((dossier && dossier.situations) || situationsLibres || []);
  const calc = () => {
    const codes = []; sel.forEach(k => { const s = SITUATIONS.find(x => x.k === k); (s ? s.codes : []).forEach(cd => { if(codes.indexOf(cd) === -1) codes.push(cd); }); });
    return codes;
  };
  const rendre = () => {
    const codes = calc();
    const inspecteur = codes.some(cd => CODE[cd] && !CODE[cd].seul);
    c.querySelector('#dmCodesRes').innerHTML = codes.length
      ? codes.map(cd => '<div style="display:flex;gap:10px;padding:6px 0;border-top:1px solid var(--line);font-size:13.5px;"><b style="width:52px;flex-shrink:0;">' + cd + '</b><span style="flex:1;min-width:0;">' + esc(CODE[cd].n) + '</span><span style="font-size:11.5px;color:var(--muted);flex-shrink:0;">' + (CODE[cd].seul ? '🩺' : '🩺 + 🚗') + badgeVoiture(cd) + '</span></div>').join('') +
        (pasChezNous(codes).length ? '<div style="margin-top:10px;padding:10px 12px;border-radius:10px;font-size:13px;background:rgba(229,72,77,.12);color:#E5484D;font-weight:700;">✖️ Pas sur notre voiture : ' + pasChezNous(codes).join(', ') + '. Pour la formation et le passage, il faudra une autre voiture aménagée.</div>'
          : (codes.some(estAmenagement) ? '<div style="margin-top:10px;padding:10px 12px;border-radius:10px;font-size:13px;background:rgba(182,255,14,.18);font-weight:700;">🚘 ' + (aVoir(codes).length ? 'Le reste est sur notre voiture.' : 'Tout est sur notre voiture : on peut le former.') + '</div>' : '')) +
        (aVoir(codes).length ? '<div style="margin-top:8px;padding:10px 12px;border-radius:10px;font-size:13px;background:rgba(255,176,32,.14);">❓ ' + aVoir(codes).join(', ') + ' : ça dépend des codes que mettra le médecin ; la formation est sans doute possible sur notre voiture.</div>' : '') +
        '<div style="margin-top:10px;padding:10px 12px;border-radius:10px;font-size:13px;' + (inspecteur ? 'background:var(--orange-soft);color:var(--on-accent);' : 'background:rgba(0,0,0,.05);') + '">' +
        (inspecteur ? '🩺 + 🚗 Le médecin agréé donne les codes ; ces aménagements se montrent ensuite en conduite à l’inspecteur : régularisation à la DDTM (s’il a le permis) ou examen (premier permis).'
                    : '🩺 Le médecin agréé donne ces codes, et c’est tout : pas de passage devant l’inspecteur. S’il a déjà le permis, il demande directement le nouveau sur l’ANTS.') + '</div>'
      : '<div class="empty">Coche ce qui le concerne.</div>';
  };
  c.innerHTML = '<input type="search" id="dmCodeQ" autocomplete="off" placeholder="🔍 Un code du médecin : 25.08, 40.11, accélérateur, rétroviseur…" style="margin-bottom:6px;font-size:14px;">' +
    '<div id="dmCodeTrouve" style="margin-bottom:12px;"></div>' +
    '<div style="font-size:13px;color:var(--muted);margin-bottom:10px;">Ou coche ce qui le concerne : les codes probables s’affichent, pour savoir à quoi s’attendre avant la visite. C’est le médecin agréé qui donne les codes.</div>' +
    '<details style="border:1px solid var(--line);border-radius:12px;padding:9px 12px;margin-bottom:12px;"><summary style="cursor:pointer;font-size:13px;font-weight:700;">🚘 Notre voiture aménagée</summary><div style="margin-top:6px;">' +
    NOTRE_VOITURE.map(x => '<div style="display:flex;gap:10px;padding:5px 0;border-top:1px solid var(--line);font-size:13px;"><span style="flex:1;min-width:0;">' + esc(x.t) + '</span><b style="flex-shrink:0;">' + x.codes.join(' · ') + '</b></div>').join('') +
    '<div style="font-size:11.5px;color:var(--muted);margin-top:4px;">Vision (42) et siège (43) : ça dépend des codes du médecin (❓).</div></div></details>' +
    '<div class="dmSitu" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:6px;margin-bottom:12px;">' +
    SITUATIONS.map(s => '<label style="display:flex;align-items:center;gap:9px;text-transform:none;font-size:13.5px;color:var(--cream);margin:0;font-weight:400;padding:8px 10px;border:1px solid var(--line);border-radius:10px;cursor:pointer;">' +
      '<input type="checkbox" value="' + s.k + '"' + (sel.has(s.k) ? ' checked' : '') + ' style="width:18px;height:18px;margin:0;flex-shrink:0;">' + esc(s.t) + '</label>').join('') + '</div>' +
    '<div style="font-size:11px;color:var(--muted);font-weight:800;letter-spacing:.06em;text-transform:uppercase;margin-bottom:4px;">Codes probables</div><div id="dmCodesRes"></div>' +
    (dossier ? '<button class="btn btn-primary" id="dmCodesGarder" style="margin-top:12px;">💾 Garder ces codes dans son dossier</button>' : '') +
    '<details style="margin-top:16px;"><summary style="cursor:pointer;font-size:13px;font-weight:700;">📖 Tous les codes (' + CODES.length + ')</summary><div style="margin-top:8px;">' +
    CODES.map(([cd, n, s]) => '<div style="display:flex;gap:10px;padding:5px 0;border-top:1px solid var(--line);font-size:13px;"><b style="width:52px;flex-shrink:0;">' + cd + '</b><span style="flex:1;min-width:0;">' + esc(n) + '</span><span style="font-size:11px;color:var(--muted);flex-shrink:0;">' + (s ? '🩺' : '🩺 + 🚗') + badgeVoiture(cd) + '</span></div>').join('') +
    '<div style="font-size:11.5px;color:var(--muted);margin-top:8px;">Source : guide DSR « Les codes sur le permis pour des raisons médicales » (2025), annexe I de l’arrêté du 20 avril 2012. 🩺 donné par le médecin agréé, rien de plus · 🩺 + 🚗 écrit par le médecin, puis montré en conduite à l’inspecteur, qui a le dernier mot · 🚘 sur notre voiture · ❓ selon les codes du médecin · ✖️ pas sur notre voiture.</div></div></details>';
  c.querySelectorAll('.dmSitu input').forEach(i => i.addEventListener('change', () => { if(i.checked) sel.add(i.value); else sel.delete(i.value); if(!dossier) situationsLibres = Array.from(sel); if(dossier && dossier.__assistant) dossier.situations = Array.from(sel); rendre(); }));
  const g = c.querySelector('#dmCodesGarder');
  /* les codes cochés par situation, plus ceux ajoutés à la main depuis la recherche */
  if(g) g.addEventListener('click', async () => { dossier.situations = Array.from(sel); dossier.codes = unirCodes(calc(), dossier.codesAjoutes); fermerFenetre(); dessiner(); await enregistrer(dossier, '💾 Codes gardés'); dessiner(); });
  /* 🔍 la recherche : ce que veut dire le code, qui le décide, notre voiture ;
     dans un dossier, ➕ l'ajoute à ses codes */
  const q = c.querySelector('#dmCodeQ'), zt = c.querySelector('#dmCodeTrouve');
  const voiture = (cd) => !estAmenagement(cd) ? '' : (SUR_NOTRE_VOITURE.has(cd) ? '🚘 sur notre voiture' : (aVoirMedecin(cd) ? '❓ selon les codes du médecin' : '✖️ pas sur notre voiture'));
  const chercher = () => {
    const l = chercherCodes(q.value);
    zt.innerHTML = !q.value.trim() ? '' : (l.length ? l.map(cd => {
      const dedans = dossier && (dossier.codes || []).indexOf(cd) !== -1;
      return '<div style="display:flex;gap:10px;align-items:center;padding:7px 0;border-top:1px solid var(--line);font-size:13.5px;">' +
        '<b style="width:52px;flex-shrink:0;">' + cd + '</b><div style="flex:1;min-width:0;">' + esc(CODE[cd].n) +
        '<div style="font-size:11.5px;color:var(--muted);">' + (CODE[cd].seul ? '🩺 le médecin agréé le met seul' : '🩺 + 🚗 écrit par le médecin, montré en conduite à l’inspecteur') + (voiture(cd) ? ' · ' + voiture(cd) : '') + '</div></div>' +
        (dossier ? '<button type="button" class="btn btn-secondary" data-dmcode="' + cd + '" style="width:auto;margin:0;padding:6px 10px;font-size:12px;flex-shrink:0;">' + (dedans ? '✓ Dans son dossier' : '➕ Ajouter') + '</button>' : '') + '</div>';
    }).join('') : '<div class="empty" style="padding:8px;">Aucun code ne correspond.</div>');
    zt.querySelectorAll('[data-dmcode]').forEach(b => b.addEventListener('click', async () => {
      const cd = b.dataset.dmcode;
      const codes = (dossier.codes || []).slice(), aj = (dossier.codesAjoutes || []).slice();
      if(codes.indexOf(cd) === -1){ codes.push(cd); if(aj.indexOf(cd) === -1) aj.push(cd); }
      else { codes.splice(codes.indexOf(cd), 1); if(aj.indexOf(cd) !== -1) aj.splice(aj.indexOf(cd), 1); }
      dossier.codes = codes; dossier.codesAjoutes = aj;
      chercher();
      if(!dossier.__assistant){ dessiner(); await enregistrer(dossier, codes.indexOf(cd) !== -1 ? '➕ ' + cd + ' ajouté' : '➖ ' + cd + ' retiré'); dessiner(); }
    }));
  };
  q.addEventListener('input', chercher);
  rendre();
}
function unirCodes(a, b){ const out = []; (a || []).concat(b || []).forEach(cd => { if(out.indexOf(cd) === -1) out.push(cd); }); return out; }
let situationsLibres = [];
function fenetreCodes(d){ const b = fenetre('⚡ Codes d’aménagement · ' + d.eleve); dessinerCodes(b, d); }

/* ---------- 🔍 maladies ---------- */
function dessinerMaladies(c, choisir){
  let q = '';
  const rendre = () => {
    const mots = q.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/\s+/).filter(Boolean);
    const l = MALADIES.filter(m => { const t = (m.g + ' ' + m.t + ' ' + m.n).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); return mots.every(w => t.indexOf(w) !== -1); });
    c.querySelector('#dmMalRes').innerHTML = l.map(m => { const s = ST[m.s];
      return '<div ' + (choisir ? 'data-dmmal="' + m.id + '" ' : '') + 'style="padding:9px 11px;border-radius:10px;margin-bottom:6px;background:' + s.fond + ';' + (choisir ? 'cursor:pointer;' : '') + '">' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:baseline;"><span style="font-size:11px;font-weight:800;color:var(--muted);">' + esc(m.g) + '</span><b style="font-size:13.5px;">' + esc(m.t) + '</b></div>' +
        '<div style="font-size:12.5px;font-weight:800;color:' + s.c + ';margin-top:3px;">' + s.t + '</div>' + (m.n ? '<div style="font-size:12.5px;margin-top:2px;">' + esc(m.n) + '</div>' : '') + '</div>'; }).join('') || '<div class="empty">Rien trouvé : le médecin agréé tranchera.</div>';
    c.querySelectorAll('[data-dmmal]').forEach(x => x.addEventListener('click', () => choisir(x.dataset.dmmal)));
  };
  c.innerHTML = '<input type="search" id="dmMalQ" placeholder="🔍 Une maladie, un handicap : amputation, épilepsie, diabète…" style="margin-bottom:10px;font-size:14px;">' +
    '<div id="dmMalRes"></div><div style="font-size:11.5px;color:var(--muted);margin-top:8px;line-height:1.5;">D’après le « Mémento pour le médecin d’un patient conducteur » (Sécurité routière, avril 2022), qui résume l’arrêté du 28 mars 2022 (liste officielle sur Légifrance). Le médecin agréé décide. ' + lien('sante', 'Service-public') + '</div>';
  const i = c.querySelector('#dmMalQ'); i.addEventListener('input', () => { q = i.value; rendre(); });
  rendre();
}

/* ---------- 📇 contacts ---------- */
function brancherDepot(c){
  const o = c.querySelector('#dmListeOuvrir');
  if(o) o.addEventListener('click', () => ouvrirLienDM({ liste: true }));
  const b = c.querySelector('#dmListeMed'); if(!b) return;
  b.addEventListener('click', async () => {
    const f = await choisirFichierDM('application/pdf');
    if(!f) return;
    b.disabled = true; b.textContent = 'Envoi…';
    try{
      const fichier = await lireFichierDM(f);
      const r = await appelDM({ action: 'demarchesListeMedecins', fichier: fichier, nom: f.name });
      LISTE_MEDECINS = r.listeMedecins || LISTE_MEDECINS;
      showToast('📎 Nouvelle liste rangée ✅');
    }catch(e){ showToast('Impossible : ' + e.message); }
    dessiner();
  });
}
function dessinerContacts(c){
  const ligne = (t, s) => '<div style="padding:8px 0;border-top:1px solid var(--line);font-size:13.5px;"><b>' + t + '</b><div style="font-size:12.5px;color:var(--muted);margin-top:2px;">' + s + '</div></div>';
  const med = boite('🩺 Médecins agréés (Côtes-d’Armor)', (LISTE_MEDECINS
      ? '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;"><span style="font-size:22px;">📄</span><div style="flex:1;min-width:0;"><b>' + esc(LISTE_MEDECINS.nom) + '</b><div style="font-size:12px;color:var(--muted);">Déposée le ' + frDate(LISTE_MEDECINS.le) + ' par ' + esc(LISTE_MEDECINS.par) + ' · jointe aux mails de visite médicale</div></div>' +
        '<button type="button" class="btn btn-secondary" id="dmListeOuvrir" style="width:auto;margin:0;padding:7px 12px;font-size:12.5px;">👁️ Ouvrir</button></div>'
      : '<div class="empty" style="padding:10px;">Aucune liste déposée : les mails donnent alors le lien de la préfecture.</div>') +
    (DM_ADMIN ? '<button type="button" class="btn btn-secondary" id="dmListeMed" style="display:inline-block;width:auto;margin:10px 0 0;padding:8px 13px;font-size:12.5px;">📎 Déposer la nouvelle liste (PDF)</button>' +
      '<div style="font-size:11.5px;color:var(--muted);margin-top:6px;">Elle remplace l’ancienne. À reprendre sur ' + lien('medecins', 'la page de la préfecture') + ' quand elle change.</div>'
      : '<div style="font-size:11.5px;color:var(--muted);margin-top:6px;">Un administrateur dépose la nouvelle quand elle change.</div>'));
  const tete = '<div style="font-size:13px;color:var(--muted);margin-bottom:10px;">Ils partent dans les mails aux élèves.</div>';
  if(outil === 'handicap'){ c.innerHTML = tete + med +
    boite('🏛️ DDTM — éducation routière (handicap)', ligne('ddtm-er-handicap@cotes-darmor.gouv.fr', 'Attestation de codification, conseil en aménagements, rendez-vous de régularisation')) +
    boite('🏥 Trestel', ligne('Centre de rééducation de Trestel, Trévou-Tréguignec', 'Évaluation de la conduite (facultative)') + '<a href="tel:+33296056565" style="color:var(--accent-text);font-weight:700;">📞 02 96 05 65 65</a>') +
    boite('📄 Papiers et liens', [lien('cerfa', 'Cerfa 14880 — avis médical'), lien('questionnaire', 'Questionnaire de santé (arrêté du 28 mars 2022, annexe III)'), lien('antsInscr', 'ANTS — inscription'), lien('antsRegul', 'ANTS — nouveau permis après régularisation'), lien('sante', 'Service-public — santé et permis')].join('<br>'));
    brancherDepot(c); return; }
  c.innerHTML = tete + boite('🏛️ Commission médicale', ligne('Préfecture des Côtes-d’Armor, place du Général de Gaulle, Saint-Brieuc', 'Alcool ou stupéfiants · sur rendez-vous · 50 €') + lien('rdvPref', 'Rendez-vous en ligne')) +
    med + boite('🧠 Examen psychotechnique', '<div style="font-size:13px;line-height:1.5;">Pas de liste officielle à télécharger : l’élève choisit un psychologue déclaré en préfecture.</div>' + lien('psychos', '🔍 Chercher « test psychotechnique permis 22 »') +
      '<div style="font-size:11.5px;color:var(--muted);margin-top:6px;">Le lien part aussi dans les mails.</div>') +
    boite('📄 Papiers et liens', [lien('cerfa', 'Cerfa 14880 — avis médical'), lien('susp', 'Service-public — suspension'), lien('invalid', 'Service-public — invalidation (0 point)'), lien('annul', 'Service-public — annulation'), lien('antsSusp', 'ANTS — après suspension'), lien('antsAnnulInscr', 'ANTS — inscription après annulation'), lien('antsAnnulTitre', 'ANTS — permis après annulation')].join('<br>'));
  brancherDepot(c);
}

/* ============================================================
   🗺️ EN BREF — l'infographie, sans créer de dossier
   ============================================================ */
/* [rond, fond, étiquette] : lisibles en clair et en sombre */
const COUL = { nous: ['#4D7C0F', 'rgba(132,204,22,.16)', 'var(--accent-text)'], eleve: ['#2563EB', 'rgba(59,130,246,.13)', '#3B82F6'],
  medecin: ['#0F766E', 'rgba(20,184,166,.15)', '#14B8A6'], trestel: ['#0F766E', 'rgba(20,184,166,.15)', '#14B8A6'],
  ddtm: ['#7E22CE', 'rgba(168,85,247,.13)', '#A855F7'], pref: ['#7E22CE', 'rgba(168,85,247,.13)', '#A855F7'] };
const BREF = { handicap: { p: 'regul', am: 'inspecteur' }, susp: { p: 'susp', mois: 4, motif: 'vitesse', type: 'invalidation', trois: true, moinsUn: true, deja: false } };
function dossierBref(){
  const b = BREF[outil];
  if(outil === 'handicap') return { parcours: b.p, codes: b.am === 'medecin' ? ['10.02'] : ['10.02', '25.08'], fait: {}, docs: {} };
  if(b.p === 'susp') return { parcours: 'susp', mois: b.mois, motif: b.motif, fait: {}, docs: {} };
  return { parcours: 'annul', type: b.type, troisAns: b.trois, moinsUnAn: b.moinsUn, dejaInvalide: b.deja, motif: b.motif, remise: aujourdHui(), finInterdiction: aujourdHui(), fait: {}, docs: {} };
}
function verdictBref(d){
  if(outil === 'handicap'){
    if(d.parcours === 'premier') return ['🆕 Premier permis aménagé', 'Médecin agréé → DDTM (attestation) → ANTS → formation → examen avec l’avis et l’attestation'];
    return codesSansInspecteur(d) ? ['🩺 Le médecin suffit', 'Boîte auto, lunettes, rétroviseurs… : visite chez le médecin agréé, puis nouveau permis sur l’ANTS. Pas de DDTM.']
                                  : ['🩺 → 🏫 → 🏛️ → 📄', 'Médecin agréé, évaluation et leçons chez nous, régularisation à la DDTM, nouveau permis sur l’ANTS.'];
  }
  if(d.parcours === 'susp'){
    const alc = d.motif === 'alcool' || d.motif === 'stups';
    if(d.mois <= 1 && !alc) return ['🚫 Rien à faire', 'Il récupère son permis à la préfecture à la fin. Pas de visite, rien à repasser.'];
    return [(d.mois >= 6 ? '🧠 + ' : '') + (alc ? '🏛️ Commission médicale' : '🩺 Médecin agréé'), 'Rien à repasser. ' + (d.mois >= 6 ? 'Examen psychotechnique (6 mois ou plus), puis ' : '') + (alc ? 'commission médicale (alcool ou stupéfiants)' : 'visite chez un médecin agréé') + ', puis demande de permis sur l’ANTS.'];
  }
  const r = regleAnnul(d);
  return [r.codeSeul ? '📘 Code seul' : '📘 Code + 🚗 Conduite', r.codeSeul ? 'Permis depuis 3 ans ou plus et interdiction de moins d’un an : il ne repasse que le code, s’il s’inscrit sur l’ANTS dans les 9 mois. Sinon, code et conduite.' : 'Il repasse le code et la conduite.'];
}
function savoirBref(d){
  if(outil === 'handicap') return ['🩺 C’est le médecin agréé qui donne les codes, sur l’avis médical (cerfa 14880). Pas le médecin traitant.',
    '🚗 Les aménagements du véhicule se montrent en conduite à l’inspecteur, qui a le dernier mot sur leurs codes. Seuls 10.02, 15.03 et 42 se passent de lui.',
    '🔒 Rendez-vous de régularisation : avis médical, carte d’identité et permis obligatoires.', '🆓 La régularisation est gratuite. La visite coûte 36 € (gratuite si invalidité ≥ 50 %).'];
  if(d.parcours === 'susp') return ['🩺 Visite médicale : si la suspension dépasse 1 mois, ou si c’est l’alcool ou les stupéfiants (commission, 50 €).',
    '🧠 Examen psychotechnique : seulement si la suspension est de 6 mois ou plus (environ 100 €).', '📅 La visite se fait sans attendre la fin : environ un mois avant.',
    '📘 Ni code ni conduite à repasser, quelle que soit la durée : le permis est suspendu, pas perdu.',
    '📄 Papiers : la décision de suspension (arrêté 3F ou 1F, ou jugement réf. 72), l’avis médical, identité, domicile, photo.',
    '⏳ Le nouveau permis peut être limité à 6 mois ou 1 an : nouvelle visite à la fin.'];
  return ['🧠 + 🩺 Examen psychotechnique et visite médicale obligatoires.', d.type === 'invalidation' ? '📅 Invalidation : 6 mois d’interdiction (1 an si déjà invalidé dans les 5 ans), à compter de la remise du permis. Tests et visite possibles avant la fin.' : '📅 Annulation : durée fixée par le juge. Tests et visite seulement après la fin de l’interdiction.',
    '📌 Code seul : permis depuis 3 ans ou plus, interdiction de moins d’un an, inscription ANTS dans les 9 mois. Passé ce délai : code et conduite.',
    d.type === 'invalidation' ? '🧾 Papiers : la lettre 48SI, la référence 44 (récépissé de remise du permis), l’avis médical. Le résultat des tests reste personnel.' : '⚖️ Papiers : la référence 7 (jugement du tribunal), l’avis médical. Le résultat des tests reste personnel.'];
}
function dessinerEnBref(c){
  const b = BREF[outil];
  const rangee = (titre, choix, cle) => '<div style="margin-bottom:9px;"><div style="font-size:11px;color:var(--muted);font-weight:800;letter-spacing:.06em;text-transform:uppercase;margin-bottom:5px;">' + titre + '</div><div style="display:flex;gap:6px;flex-wrap:wrap;">' +
    choix.map(([v, t]) => pastille(t, String(b[cle]) === String(v), 'data-dmbref="' + cle + '" data-dmval="' + v + '"')).join('') + '</div></div>';
  let h = '';
  if(outil === 'handicap'){
    h += rangee('Sa situation', [['regul', '♿ Il a déjà le permis'], ['premier', '🆕 Premier permis']], 'p');
    if(b.p === 'regul') h += rangee('Ses aménagements', [['medecin', '👓 Boîte auto, lunettes, rétros (médecin seul)'], ['inspecteur', '🔧 Autres aménagements']], 'am');
  }else{
    h += rangee('Sa situation', [['susp', '⏸️ Suspension'], ['annul', '⛔ Annulation ou invalidation']], 'p');
    if(b.p === 'susp') h += rangee('Durée', [[1, '1 mois ou moins'], [4, 'De 1 à 6 mois'], [6, '6 mois ou plus']], 'mois');
    else { h += rangee('Type', [['invalidation', '0 point (lettre 48SI)'], ['annulation', 'Annulée par le juge']], 'type');
      h += rangee('Son permis', [['true', '3 ans ou plus'], ['false', 'Moins de 3 ans']], 'trois');
      h += b.type === 'invalidation' ? rangee('Déjà invalidé dans les 5 ans ?', [['false', 'Non (6 mois)'], ['true', 'Oui (1 an)']], 'deja') : rangee('Interdiction', [['true', 'Moins d’un an'], ['false', '1 an ou plus']], 'moinsUn'); }
    h += rangee('Motif', [['vitesse', 'Vitesse ou autre'], ['alcool', '🍷 Alcool ou stupéfiants']], 'motif');
  }
  const d = dossierBref();
  const [gros, petit] = verdictBref(d);
  h += '<div style="border-radius:16px;padding:14px 16px;margin:6px 0 14px;background:var(--orange-soft);border:1px solid var(--orange);color:var(--on-accent);">' +
    '<div style="font-size:22px;font-weight:800;line-height:1.2;">' + gros + '</div><div style="font-size:13.5px;margin-top:4px;line-height:1.45;">' + esc(petit) + '</div></div>';
  const et = etapesDe(d).filter(x => ['infos', 'maladie', 'accord', 'planning'].indexOf(x.cle) === -1);
  h += '<div style="position:relative;padding-left:4px;">' + et.map((x, i) => {
    const q = QUI[x.qui]; const co = COUL[x.qui] || COUL.nous; const der = i === et.length - 1;
    return '<div style="display:flex;gap:12px;position:relative;">' +
      '<div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0;width:32px;">' +
        '<div style="width:32px;height:32px;border-radius:50%;background:' + co[0] + ';color:#fff;font-weight:800;font-size:14px;display:flex;align-items:center;justify-content:center;">' + (i + 1) + '</div>' +
        (der ? '' : '<div style="flex:1;width:3px;background:var(--line);margin:3px 0;min-height:14px;"></div>') + '</div>' +
      '<div style="flex:1;min-width:0;border-radius:12px;padding:9px 12px;margin-bottom:10px;background:' + co[1] + ';' + (x.facultatif ? 'border:1px dashed ' + co[0] + ';' : '') + '">' +
        '<div style="font-size:11px;font-weight:800;color:' + co[2] + ';letter-spacing:.04em;text-transform:uppercase;">' + q[0] + ' ' + q[1] + (x.facultatif ? ' · facultatif' : '') + '</div>' +
        '<div style="font-size:14.5px;font-weight:800;color:var(--cream);margin-top:1px;">' + esc(x.t) + '</div>' +
        ((x.bref || []).filter(t => t !== 'Facultatif' && t !== 'Facultative').length ? '<div style="display:flex;gap:5px;flex-wrap:wrap;margin-top:6px;">' + x.bref.filter(t => t !== 'Facultatif' && t !== 'Facultative').map(t => '<span style="font-size:12px;padding:3px 8px;border-radius:999px;background:rgba(127,127,127,.14);border:1px solid rgba(127,127,127,.22);color:var(--cream);">' + esc(t) + '</span>').join('') + '</div>' : '') +
      '</div></div>';
  }).join('') + '</div>';
  h += boite('💡 Bon à savoir', savoirBref(d).map(t => '<div style="padding:3px 0;">' + esc(t) + '</div>').join(''));
  h += '<div style="display:flex;gap:6px;flex-wrap:wrap;font-size:11.5px;color:var(--muted);margin:-2px 0 12px;">' + ['nous', 'eleve', 'medecin', 'ddtm'].map(k => '<span style="display:inline-flex;align-items:center;gap:5px;"><span style="width:10px;height:10px;border-radius:50%;background:' + COUL[k][0] + ';"></span>' + (k === 'ddtm' ? 'DDTM ou préfecture' : QUI[k][1]) + '</span>').join(' · ') + '</div>';
  h += '<button class="btn btn-secondary" id="dmCopier" style="width:auto;margin:0;padding:9px 14px;font-size:13px;">📋 Copier ce résumé (à coller dans un message)</button>';
  c.innerHTML = h;
  c.querySelectorAll('[data-dmbref]').forEach(x => x.addEventListener('click', () => {
    const k = x.dataset.dmbref, v = x.dataset.dmval;
    b[k] = (v === 'true' || v === 'false') ? v === 'true' : (/^\d+$/.test(v) ? Number(v) : v); dessinerEnBref(c); }));
  $('#dmCopier', c).addEventListener('click', () => {
    const t = gros.replace(/<[^>]+>/g, '') + '\n' + petit + '\n\n' + et.map((x, i) => (i + 1) + '. ' + x.t + (x.bref && x.bref.length ? ' (' + x.bref.join(', ') + ')' : '')).join('\n') + '\n\n' + savoirBref(d).join('\n');
    try { navigator.clipboard.writeText(t); } catch(e){}
    toast('📋 Résumé copié');
  });
}

/* ---------- ➕ nouveau dossier ---------- */
function assistant(nomImpose, opts){
  opts = opts || {};
  const b = fenetre(opts.titre || '➕ Nouveau dossier');
  const T = aujourdHui();
  const d = { id: '', eleve: nomImpose || '', parcours: '', fait: {}, docs: {}, codes: [], situations: [], __assistant: true };
  let pas = 1;
  const rendre = () => {
    let h = '';
    if(pas === 1){
      if(opts.intro) h += '<div style="font-size:13px;line-height:1.5;margin-bottom:10px;padding:9px 11px;border-radius:10px;border:1px solid var(--line);">' + opts.intro + '</div>';
      h += '<label for="dmNom">L’élève</label><input type="text" id="dmNom" placeholder="Son nom" autocomplete="off"' + (document.getElementById('listeEleves') ? ' list="listeEleves"' : '') + (nomImpose ? ' readonly' : '') + ' value="' + esc(d.eleve) + '">' +
        '<label>Sa situation</label><div style="display:flex;flex-direction:column;gap:7px;margin-bottom:14px;">' +
        OUTILS[outil].parcours.map(k => '<button type="button" data-dmp="' + k + '" class="' + (d.parcours === k ? '' : 'btn btn-secondary') + '" style="text-align:left;margin:0;padding:11px 13px;border-radius:12px;' + (d.parcours === k ? 'background:var(--orange-soft);border:1px solid var(--orange);color:var(--on-accent);' : '') + '">' +
          '<b>' + PARCOURS[k].em + ' ' + PARCOURS[k].t + '</b><div style="font-size:12px;opacity:.8;font-weight:400;">' + PARCOURS[k].sous + '</div></button>').join('') + '</div>';
    }else if(d.parcours === 'regul' || d.parcours === 'premier'){
      if(pas === 2){
        h += '<label>Sa maladie ou son handicap</label><div id="dmAsMal"></div>';
      }else{
        const m = MALADIES.find(x => x.id === d.maladie);
        if(m){ const s = ST[m.s]; h += '<div style="padding:9px 11px;border-radius:10px;margin-bottom:12px;background:' + s.fond + ';"><b>' + esc(m.t) + '</b><div style="font-size:12.5px;font-weight:800;color:' + s.c + ';">' + s.t + '</div>' + (m.n ? '<div style="font-size:12.5px;">' + esc(m.n) + '</div>' : '') + '</div>'; }
        if(m && m.s === 'def') h += '<div style="padding:10px 12px;border-radius:10px;background:rgba(229,72,77,.12);color:#E5484D;font-weight:700;margin-bottom:12px;">⛔ Incompatible définitivement : pas de formation possible. On l’oriente vers le médecin agréé pour un avis.</div>';
        h += '<label>Évaluation à Trestel (facultative)</label><select id="dmAsTrestel"><option value="">Pas prévue</option><option value="prevue">Prévue</option><option value="faite">Faite (je déposerai le résumé)</option></select>' +
          '<label>Visite chez un médecin agréé</label><select id="dmAsVisite"><option value="">Pas encore faite → lui envoyer la liste des médecins et le cerfa</option><option value="faite">Faite (je déposerai l’avis médical)</option></select>' +
          '<label>Codes prévus</label><div id="dmAsCodes"></div>';
      }
    }else if(d.parcours === 'susp'){
      h += '<div class="duo"><div><label for="dmMois">Durée (mois)</label><input type="number" id="dmMois" min="0" value="' + esc(d.mois || 6) + '"></div>' +
        '<div><label for="dmFin">Fin de la suspension</label><input type="date" id="dmFin" value="' + esc(d.fin || plusMois(T, 3)) + '"></div></div>' +
        '<label for="dmMotif">Motif</label><select id="dmMotif"><option value="vitesse">Vitesse ou autre infraction</option><option value="alcool">Alcool</option><option value="stups">Stupéfiants</option></select>' +
        '<div id="dmAsApercu" style="font-size:13px;line-height:1.5;margin-top:6px;"></div>';
    }else{
      h += '<label for="dmType">Type</label><select id="dmType"><option value="invalidation">Invalidation : 0 point (lettre 48SI)</option><option value="annulation">Annulation par le juge</option></select>' +
        '<div id="dmTypeChamps"></div>' +
        '<label style="display:flex;align-items:center;gap:9px;text-transform:none;font-size:14px;color:var(--cream);font-weight:400;margin:8px 0;"><input type="checkbox" id="dmTrois" style="width:18px;height:18px;margin:0;"> Il avait son permis depuis 3 ans ou plus</label>' +
        '<label for="dmMotifA">Lié à l’alcool ou aux stupéfiants ?</label><select id="dmMotifA"><option value="vitesse">Non</option><option value="alcool">Alcool</option><option value="stups">Stupéfiants</option></select>' +
        '<div id="dmAsApercu" style="font-size:13px;line-height:1.5;margin-top:6px;padding:10px 12px;border-radius:10px;background:var(--orange-soft);color:var(--on-accent);"></div>';
    }
    const dernier = (d.parcours === 'susp' || d.parcours === 'annul') ? pas === 2 : pas === 3;
    h += '<div class="btn-row">' + (pas > 1 ? '<button class="btn btn-secondary" id="dmPrec">← Retour</button>' : '<button class="btn btn-secondary" id="dmAnnuler">' + (opts.plusTard ? 'Plus tard' : 'Annuler') + '</button>') +
      '<button class="btn btn-primary" id="dmSuiv">' + (dernier ? '💾 Créer le dossier' : 'Suivant →') + '</button></div>';
    b.innerHTML = h;
    b.querySelectorAll('[data-dmp]').forEach(x => x.addEventListener('click', () => { d.eleve = $('#dmNom', b).value; d.parcours = x.dataset.dmp; rendre(); }));
    if(pas === 2 && (d.parcours === 'regul' || d.parcours === 'premier')) dessinerMaladies($('#dmAsMal', b), (id) => { d.maladie = id; pas = 3; rendre(); });
    if(pas === 3) dessinerCodes($('#dmAsCodes', b), d);
    if($('#dmAsCodes', b)){ const g = $('#dmCodesGarder', b); if(g) g.remove(); }
    const apercu = () => {
      const a = $('#dmAsApercu', b); if(!a) return;
      if(d.parcours === 'susp'){ lireSusp(); const et = etapesDe(d); a.innerHTML = '<b>Ce qu’il aura à faire :</b><br>' + et.slice(1).map(x => '• ' + esc(x.t)).join('<br>'); }
      else { lireAnnul(); const r = regleAnnul(d); a.innerHTML = '<b>' + esc(r.texte) + '</b>' + (r.fin ? '<br>Fin d’interdiction : ' + frDate(r.fin) : ''); }
    };
    const lireSusp = () => { d.mois = Number($('#dmMois', b).value) || 0; d.fin = $('#dmFin', b).value; d.motif = $('#dmMotif', b).value; };
    const typeChamps = () => {
      const t = $('#dmType', b).value; d.type = t;
      $('#dmTypeChamps', b).innerHTML = t === 'invalidation'
        ? '<label for="dmRemise">Permis remis à la préfecture le</label><input type="date" id="dmRemise" value="' + esc(d.remise || plusMois(T, -1)) + '">' +
          '<label style="display:flex;align-items:center;gap:9px;text-transform:none;font-size:14px;color:var(--cream);font-weight:400;margin:8px 0;"><input type="checkbox" id="dmDeja" style="width:18px;height:18px;margin:0;"> Déjà invalidé dans les 5 dernières années (→ 1 an)</label>'
        : '<label for="dmFinI">Fin de l’interdiction (jugement)</label><input type="date" id="dmFinI" value="' + esc(d.finInterdiction || plusMois(T, 4)) + '">' +
          '<label style="display:flex;align-items:center;gap:9px;text-transform:none;font-size:14px;color:var(--cream);font-weight:400;margin:8px 0;"><input type="checkbox" id="dmMoinsUn" style="width:18px;height:18px;margin:0;"> Interdiction de moins d’un an</label>';
      $('#dmTypeChamps', b).querySelectorAll('input').forEach(x => x.addEventListener('change', apercu));
      apercu();
    };
    const lireAnnul = () => { d.type = $('#dmType', b).value; d.troisAns = $('#dmTrois', b).checked; d.motif = $('#dmMotifA', b).value;
      if(d.type === 'invalidation'){ d.remise = ($('#dmRemise', b) || {}).value; d.dejaInvalide = ($('#dmDeja', b) || {}).checked; }
      else { d.finInterdiction = ($('#dmFinI', b) || {}).value; d.moinsUnAn = ($('#dmMoinsUn', b) || {}).checked; } };
    if(d.parcours === 'susp' && pas === 2){ b.querySelectorAll('input,select').forEach(x => x.addEventListener('change', apercu)); apercu(); }
    if(d.parcours === 'annul' && pas === 2){ $('#dmType', b).addEventListener('change', typeChamps); b.querySelectorAll('#dmTrois,#dmMotifA').forEach(x => x.addEventListener('change', apercu)); typeChamps(); }
    const pr = $('#dmPrec', b); if(pr) pr.addEventListener('click', () => { pas--; rendre(); });
    const an = $('#dmAnnuler', b); if(an) an.addEventListener('click', fermerFenetre);
    $('#dmSuiv', b).addEventListener('click', async () => {
      if(pas === 1){
        d.eleve = $('#dmNom', b).value.replace(/\s+/g, ' ').trim();
        if(!d.eleve){ showToast('Indique son nom.'); return; }
        if(!d.parcours){ showToast('Choisis sa situation.'); return; }
        const deja = DOSSIERS.find(x => OUTILS[outil].parcours.indexOf(x.parcours) !== -1 && memeEleve(x.eleve, d.eleve));
        if(deja && !(await confirmer(d.eleve + ' a déjà un dossier (' + PARCOURS[deja.parcours].t.toLowerCase() + '). En créer un autre ?', 'Déjà un dossier'))) return;
        pas = 2; rendre(); return;
      }
      if(pas === 2 && (d.parcours === 'regul' || d.parcours === 'premier')){ showToast('Choisis dans la liste (ou cherche « membre »).'); return; }
      if(d.parcours === 'regul' || d.parcours === 'premier'){
        d.fait.maladie = aujourdHui();
        const tr = $('#dmAsTrestel', b).value; if(tr === 'faite') d.fait.trestel = aujourdHui(); else if(tr === '') d.fait.trestel = 'non';
        if($('#dmAsVisite', b).value === 'faite'){ d.fait.visite = aujourdHui(); d.visiteDate = aujourdHui(); }
        d.codes = unirCodes((function(){ const out = []; (d.situations || []).forEach(k => { const s = SITUATIONS.find(x => x.k === k); (s ? s.codes : []).forEach(cd => { if(out.indexOf(cd) === -1) out.push(cd); }); }); return out; })(), d.codesAjoutes);
      }else if(d.parcours === 'susp'){ lireSusp(); d.fait.infos = aujourdHui(); }
      else { lireAnnul(); d.fait.infos = aujourdHui(); }
      const bs = $('#dmSuiv', b); bs.disabled = true; bs.textContent = '…';
      const n = await enregistrer(d, '💾 Dossier créé');
      if(!n){ bs.disabled = false; bs.textContent = '💾 Créer le dossier'; return; }
      fermerFenetre();
      if(opts.apres) opts.apres(n); else { ouvert = n.id; dessiner(); }
      /* il a des démarches à faire : le message est proposé tout de suite */
      if(etat(n).suivante && etat(n).suivante.qui !== 'nous') setTimeout(() => fenetreMail(n, 'mail'), 300);
    });
  };
  rendre();
}

/* ---------- ✉️ le mail : vouvoiement par défaut, on peut tutoyer ----------
   Toutes les étapes qui restent, dans l'ordre, avec qui s'en occupe, ce
   qu'il faut savoir et les papiers qui manquent : l'élève a tout. */
function etapeEleve(d, x, v){
  const alc = d.motif === 'alcool' || d.motif === 'stups';
  const regul = d.parcours === 'regul', premier = d.parcours === 'premier', annul = d.parcours === 'annul';
  const inval = d.type === 'invalidation';
  const r = annul ? regleAnnul(d) : null;
  const papierDecision = d.parcours === 'susp' ? 'la décision de suspension' : (annul ? (inval ? 'la lettre 48SI' : 'le jugement (référence 7)') : '');
  const apporter = 'Apportez votre pièce d’identité' + (regul ? ', votre permis' : '') + (papierDecision ? ', ' + papierDecision : '') + ' et le formulaire cerfa 14880 pré-rempli : ' + L.cerfa;
  const medecin = 'Prenez rendez-vous avec un médecin agréé par la préfecture, pas votre médecin traitant. ' +
    (listeJointe ? 'La liste des médecins agréés est jointe à ce message.' : 'La liste : ' + L.medecins) + '\n' + apporter + '\nLa visite coûte 36 €' + (regul || premier ? ' (gratuite si votre taux d’invalidité est d’au moins 50 %). C’est le médecin qui écrit les codes de vos aménagements sur l’avis médical' : '') + '.';
  const commission = 'Alcool ou stupéfiants : c’est la commission médicale de la préfecture, à Saint-Brieuc, sur rendez-vous : ' + L.rdvPref + '\nElle coûte 50 €, avec des analyses de sang ou d’urine à faire quelques jours avant (apportez les résultats).\n' + apporter;
  const M = {
    maladie: ['Votre situation est notée', ''],
    trestel: ['Évaluation de conduite au centre de Trestel (si vous le souhaitez)', 'Envoyez-nous son compte rendu : nous le gardons dans votre dossier.'],
    visite: x.qui === 'pref' ? ['Commission médicale à la préfecture', commission + (d.parcours === 'susp' ? '\nÀ faire sans attendre la fin : environ un mois avant.' : (annul ? (inval ? '\nVous pouvez la passer avant la fin de l’interdiction.' : '\nÀ passer après la fin de l’interdiction.') : ''))]
                             : ['Visite chez un médecin agréé', medecin + (d.parcours === 'susp' ? '\nÀ faire sans attendre la fin : environ un mois avant.' : (annul ? (inval ? '\nVous pouvez la passer avant la fin de l’interdiction.' : '\nÀ passer après la fin de l’interdiction.') : ''))],
    eval: ['Évaluation de conduite à l’école' + (regul || premier ? ', avec vos aménagements' : ''), 'Nous vous proposerons ensuite un nombre d’heures.'],
    accord: ['Nous dire si les heures proposées vous conviennent', ''],
    planning: ['Planification de vos leçons', ''],
    pieces: ['Nous envoyer les papiers pour le rendez-vous à la DDTM', 'Ils sont obligatoires : l’avis médical, votre carte d’identité et votre permis.'],
    rdv: ['Rendez-vous de régularisation à la DDTM', 'Une conduite d’environ 20 à 30 minutes avec la voiture de l’école : vous montrez à l’inspecteur que vous utilisez bien vos aménagements. C’est gratuit.'],
    regul: ['Remise du CEPC par l’inspecteur', 'Si tout va bien, l’inspecteur vous remet le CEPC le jour même. Il est valable 4 mois.'],
    codif: ['Envoi de votre avis médical et de votre pièce d’identité à la DDTM', 'La DDTM établit l’attestation de codification, avec les codes du médecin.'],
    formation: ['Formation au code et à la conduite, avec vos aménagements', ''],
    prevenir: ['Nous prévenons la DDTM que votre examen se passe avec des aménagements', ''],
    examen: ['Examen de conduite', 'Le jour de l’examen, apportez obligatoirement l’avis médical original et l’attestation de codification : sans ces deux papiers, pas de permis.'],
    infos: [d.parcours === 'susp' ? 'Votre suspension est notée' : 'Votre décision est notée', ''],
    recup: ['Récupérer votre permis à la préfecture à la fin de la suspension', 'Pas de visite médicale, rien à repasser.'],
    psy: ['Examen psychotechnique', 'Chez un psychologue déclaré en préfecture, environ 100 €, au moins 40 minutes. Pour en trouver un : ' + L.psychos + '\nLe résultat est pour vous : dites-nous simplement quand c’est fait.' + (d.parcours === 'susp' ? ' Il est demandé parce que la suspension est de 6 mois ou plus, et se passe avant la visite médicale.' : (inval ? ' Vous pouvez le passer avant la fin de l’interdiction.' : ' À passer après la fin de l’interdiction.'))],
    lecons: [d.parcours === 'susp' ? 'Leçons de reprise (si vous le souhaitez)' : 'Quelques leçons pour vous habituer (si vous le souhaitez)', ''],
    recu: ['Vérifier la durée de votre nouveau permis', 'S’il est limité à 6 mois ou 1 an, il faudra repasser la visite médicale à la fin.'],
    code: ['Examen du code (ETG)', ''],
    conduite: ['Leçons de conduite', ''],
    examenC: ['Examen de conduite', '']
  };
  if(x.cle === 'ants'){
    if(d.parcours === 'susp') return ['Demande de votre permis sur l’ANTS', 'Choisir « demande à la suite d’une suspension », au plus tôt 10 jours avant la fin : ' + L.antsSusp];
    if(premier) return ['Inscription au permis sur l’ANTS, case « soumis à visite médicale »', 'Avec votre avis médical.'];
    return ['Inscription à l’examen sur l’ANTS', (r.codeSeul ? 'À faire avant le ' + frDate(r.limite) + ' pour ne repasser que le code. Attention : après cette date, il faudra repasser le code ET la conduite. ' : '') + 'Nous pouvons la faire pour vous.'];
  }
  if(x.cle === 'titre'){
    if(annul) return ['Demande de votre permis sur l’ANTS, à la fin de l’interdiction', 'Nous pouvons la faire pour vous : ' + L.antsAnnulTitre];
    if(premier) return ['Demande de votre permis sur l’ANTS', 'Avec l’avis médical, l’attestation de codification et le CEPC.'];
    return ['Demande de votre nouveau permis sur l’ANTS', (codesSansInspecteur(d) ? 'Avec l’avis médical : pas besoin de passer à la DDTM, le médecin a mis tous les codes. ' : 'Avec l’avis médical et le CEPC. ') + L.antsRegul];
  }
  return M[x.cle] || [x.t, ''];
}
/* la liste des médecins part en pièce jointe d'un MAIL, quand elle est déposée */
let listeJointe = false;
function texteMail(d, tu, canal){
  listeJointe = canal !== 'msg' && !!LISTE_MEDECINS;
  const e = etat(d);
  /* le prénom : « MARTIN Léa » → Léa ; « Léa Martin » → Léa */
  const mots = d.eleve.trim().split(/\s+/);
  const majuscules = mots.filter(w => w.length > 1 && w === w.toUpperCase() && /[A-ZÀ-Ý]/.test(w));
  const prenom = majuscules.length && majuscules.length < mots.length ? mots.filter(w => majuscules.indexOf(w) === -1).join(' ') : mots[0];
  const faites = e.et.filter(x => { const w = (d.fait || {})[x.cle]; return w && w !== 'non'; });
  const reste = e.et.filter(x => !(d.fait || {})[x.cle]);
  const qui = (x) => (x.qui === 'nous' ? 'nous nous en occupons' : (x.qui === 'ddtm' ? 'à la DDTM' : (x.cle === 'regul' || x.cle === 'maladie' ? '' : 'à faire par vous')));
  let t = 'Bonjour ' + prenom + ',\n\nVoici où en est votre dossier (' + PARCOURS[d.parcours].t.toLowerCase() + ').\n\n';
  if(faites.length) t += '✅ C’est fait :\n' + faites.map(x => '• ' + etapeEleve(d, x)[0]).join('\n') + '\n\n';
  if(e.suivante) t += '➡️ Prochaine étape : ' + etapeEleve(d, e.suivante)[0] + '\n\n';
  if(reste.length){
    t += '📋 Ce qu’il reste à faire, dans l’ordre :\n';
    reste.forEach((x, i) => {
      const [titre, txt] = etapeEleve(d, x);
      /* seulement les papiers que l'élève doit fournir ou apporter (pas l'attestation que la DDTM nous envoie) */
      const manque = (x.docs || []).filter(k => !(d.docs || {})[k] && !(k === 'codif' && x.cle !== 'examen')).map(k => DOCS[k].replace(/^\S+\s/, ''));
      t += '\n' + (i + 1) + '. ' + titre + (qui(x) ? ' — ' + qui(x) : '') + '\n' + (txt ? txt + '\n' : '') + (manque.length ? 'Papiers : ' + manque.join(' ; ') + '.\n' : '');
    });
    t += '\n';
  }
  if(d.parcours === 'annul'){ const r = regleAnnul(d); t += '⛔ Vous repassez : ' + r.texte + '.\n\n'; }
  t += 'Envoyez-nous les papiers dès que vous les avez, et répondez-nous ici si vous avez une question.\n\nÉvolution Conduites';
  return tu ? tutoyer(t) : t;
}
/* le même texte, tutoyé */
function tutoyer(t){
  return [[/\bVoici où en est votre\b/g, 'Voici où en est ton'], [/\bPrenez\b/g, 'Prends'], [/\bApportez\b/g, 'Apporte'], [/\bapportez\b/g, 'apporte'], [/\bEnvoyez-nous\b/g, 'Envoie-nous'], [/\brépondez-nous\b/g, 'réponds-nous'], [/\bdites-nous\b/g, 'dis-nous'],
    [/\bvous avez\b/g, 'tu as'], [/\bvous les avez\b/g, 'tu les as'], [/\bVous pouvez\b/g, 'Tu peux'], [/\bVous repassez\b/g, 'Tu repasses'], [/\bvous montrez\b/g, 'tu montres'], [/\bvous utilisez\b/g, 'tu utilises'],
    [/\bvous remet\b/g, 'te remet'], [/\bvous proposerons\b/g, 'te proposerons'], [/\bNous dire si les heures proposées vous conviennent\b/g, 'Nous dire si les heures proposées te conviennent'],
    [/\bsi vous le souhaitez\b/g, 'si tu le souhaites'], [/\bpour vous habituer\b/g, 'pour t’habituer'], [/\bpour vous\b/g, 'pour toi'], [/à faire par vous/g, 'à faire par toi'],
    [/\bvotre\b/g, 'ton'], [/\bVotre\b/g, 'Ton'], [/\bvos\b/g, 'tes'], [/\bVos\b/g, 'Tes'], [/\bton carte\b/g, 'ta carte'], [/\bton pièce\b/g, 'ta pièce'], [/\bton situation\b/g, 'ta situation'], [/\bTon situation\b/g, 'Ta situation'],
    [/\bton suspension\b/g, 'ta suspension'], [/\bTon suspension\b/g, 'Ta suspension'], [/\bTon décision\b/g, 'Ta décision'], [/\bton décision\b/g, 'ta décision'], [/\bton formation\b/g, 'ta formation'], [/\bton invalidité\b/g, 'ton invalidité']]
    .reduce((x, [a, b]) => x.replace(a, b), t);
}
function fenetreMail(d, canal){
  const b = fenetre(canal === 'msg' ? '💬 Par la messagerie · ' + d.eleve : '✉️ Lui envoyer où il en est');
  const objet = (tu) => (tu ? 'Ton' : 'Votre') + ' dossier ' + PARCOURS[d.parcours].t.toLowerCase() + ' : où ' + (tu ? 'tu en es' : 'vous en êtes');
  const texte = texteMail(d, d.tu, canal);
  const joint = canal !== 'msg' && /médecins agréés est jointe/.test(texte);
  b.innerHTML = '<div style="display:flex;gap:6px;margin-bottom:10px;">' + pastille('Vouvoyer', !d.tu, 'data-dmtu="0"') + pastille('Tutoyer', !!d.tu, 'data-dmtu="1"') + '</div>' +
    (canal === 'msg' ? '<div style="font-size:12.5px;color:var(--muted);margin-bottom:10px;">Dans sa conversation « Le bureau » de son espace élève, avec une notification sur son téléphone.</div>'
      : '<label for="dmA">À</label><input type="email" id="dmA" placeholder="son adresse mail" autocomplete="off"><label for="dmObj">Objet</label><input type="text" id="dmObj" value="' + esc(objet(d.tu)) + '">') +
    (joint ? '<div style="font-size:13px;margin:0 0 8px;padding:8px 11px;border-radius:10px;border:1px solid var(--line);">📎 Joint : <b>' + esc(LISTE_MEDECINS.nom) + '</b> <span style="color:var(--muted);">(déposée le ' + frDate(LISTE_MEDECINS.le) + ')</span></div>' : '') +
    '<label for="dmTexte">✏️ Le message : relis-le et modifie-le avant d’envoyer</label><textarea id="dmTexte" rows="16" style="width:100%;box-sizing:border-box;font-family:inherit;font-size:13.5px;line-height:1.5;min-height:320px;">' + esc(texte) + '</textarea>' +
    '<div class="btn-row"><button class="btn btn-secondary" id="dmMAnn">Annuler</button><button class="btn btn-primary" id="dmMEnv">' + (canal === 'msg' ? '💬 Envoyer dans sa conversation' : '✉️ Envoyer le mail') + '</button></div>';
  /* vouvoyer ou tutoyer : retenu dans son dossier */
  b.querySelectorAll('[data-dmtu]').forEach(x => x.addEventListener('click', () => {
    const tu = x.dataset.dmtu === '1';
    if(!!d.tu === tu) return;
    d.tu = tu; enregistrer(d); fenetreMail(d, canal);
  }));
  /* son adresse, lue dans sa fiche */
  const ia = $('#dmA', b);
  if(ia){
    appelPrep({ action: 'contactEleve', eleve: d.eleve }).then(r => {
      const m = ((r && r.contact) || {}).email || '';
      if(m && !ia.value) ia.value = m;
      if(!m) ia.placeholder = 'Pas d’adresse dans sa fiche : tape-la';
    }).catch(() => {});
  }
  $('#dmMAnn', b).addEventListener('click', fermerFenetre);
  const bE = $('#dmMEnv', b);
  bE.addEventListener('click', async () => {
    const t = $('#dmTexte', b).value;
    if(!t.trim()){ showToast('Le message est vide.'); return; }
    const etiquette = bE.textContent;
    try{
      let r;
      if(canal === 'msg'){
        bE.disabled = true; bE.textContent = '…';
        r = await appelDM({ action: 'demarchesMessagerie', id: d.id, texte: t });
        showToast('💬 Envoyé dans sa messagerie ✅');
      }else{
        const a = ia.value.trim();
        if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a)){ showToast('Son adresse mail ?'); ia.focus(); return; }
        bE.disabled = true; bE.textContent = '…';
        r = await appelDM({ action: 'demarchesMail', id: d.id, a: a, sujet: $('#dmObj', b).value.trim() || objet(d.tu), texte: t, joindreListe: joint });
        showToast('✉️ Envoyé à ' + a + (r.jointe ? ' (liste jointe)' : '') + ' ✅');
      }
      if(r && r.dossier) prendreDossier(r.dossier);
      fermerFenetre();
      dessiner();
    }catch(e){ bE.disabled = false; bE.textContent = etiquette; showToast('Impossible : ' + e.message); }
  });
}

/* ---------- fenêtre et petit message ---------- */
let fondOuvert = null;
function fenetre(titre){
  fermerFenetre();
  const f = document.createElement('div'); f.className = 'overlay show';
  const m = document.createElement('div'); m.className = 'modal'; m.style.cssText = 'max-width:min(620px,95vw);max-height:90vh;overflow-y:auto;';
  /* un ✕ pour fermer ; pas de fermeture en touchant à côté : un message
     en cours d'écriture ne se perd pas d'un geste malheureux */
  m.innerHTML = '<div style="display:flex;align-items:flex-start;gap:10px;"><h3 style="flex:1;min-width:0;">' + esc(titre) + '</h3>' +
    '<button type="button" class="btn btn-secondary dmFermer" aria-label="Fermer" style="width:auto;margin:0;padding:5px 11px;">✕</button></div><div class="dmCorpsF"></div>';
  f.appendChild(m); document.body.appendChild(f); fondOuvert = f;
  m.querySelector('.dmFermer').addEventListener('click', fermerFenetre);
  return m.querySelector('.dmCorpsF');
}
function fermerFenetre(){ if(fondOuvert) fondOuvert.remove(); fondOuvert = null; }
function toast(t){ showToast(t); }

/* Le même élève, quel que soit l'ordre des mots (la feuille HANDICAP
   était tenue en « Nom Prénom », le reste de l'outil en « Prénom Nom ») */
function memeEleve(a, b){
  const n = (x) => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if(!n(a) || !n(b)) return false;
  if(n(a) === n(b)) return true;
  if(typeof memePersonne === 'function') return !!memePersonne(a, b);
  return n(a).split(' ').sort().join(' ') === n(b).split(' ').sort().join(' ');
}
const outilDe = (d) => (d.parcours === 'susp' || d.parcours === 'annul') ? 'susp' : 'handicap';

/* ============================================================
   BRANCHEMENT : les deux cartes, le dossier de l'élève, les
   cartes de cours (« Mes prochains cours »)
   ============================================================ */
const ZONES_DM = { handicap: 'handicapZone', susp: 'suspensionZone' };
const ETATS_DM = { handicap: { vue: 'dossiers', filtre: 'tout', ouvert: null, cherche: '' },
                   susp: { vue: 'dossiers', filtre: 'tout', ouvert: null, cherche: '' } };
function garderEtat(){ if(!contexteEleve) ETATS_DM[outil] = { vue: vue, filtre: filtre, ouvert: ouvert, cherche: cherche }; }
function prendreEtat(o){ outil = o; const e = ETATS_DM[o]; vue = e.vue; filtre = e.filtre; ouvert = e.ouvert; cherche = e.cherche; }

async function afficherEcranDM(o){
  const z = document.getElementById(ZONES_DM[o]);
  if(!z) return;
  garderEtat();
  contexteEleve = null; retourDuDossier = null;
  prendreEtat(o);
  zoneRacine = z;
  if(!dmCharge) z.innerHTML = '<div class="empty">Chargement…</div>';
  try{ await chargerDemarches(); }
  catch(e){ z.innerHTML = '<div class="empty">⚠️ ' + esc(e.message || e) + '</div>'; return; }
  if(zoneRacine !== z) return;
  dessiner();
}
window.afficherHandicap = () => afficherEcranDM('handicap');
window.afficherSuspension = () => afficherEcranDM('susp');

/* 📂 L'onglet ♿ du dossier de l'élève : le même panneau (David) */
window.panneauDemarchesEleve = async function(corps, nom){
  await chargerDemarches();
  garderEtat();
  contexteEleve = nom;
  const liste = () => {
    ouvert = null; zoneRacine = corps;
    const siens = DOSSIERS.filter(x => memeEleve(x.eleve, nom));
    let h = siens.length ? '' : '<div class="empty">Aucune démarche à son nom.</div>';
    /* 🔗 v1568 — sa formation en appelle une, et elle n'est pas ouverte
       (un élève inscrit avant la v1568) : on la propose en premier */
    const gf = genreDeFormation(formationDe(nom));
    if(gf && !dossierEnCours(nom, gf) && sectionModifiableDM()) h += '<button type="button" class="btn btn-primary" id="dmSelonForm" style="margin:0 0 10px;flex-direction:column;gap:2px;">' +
      (gf === 'susp' ? '⛔ Ouvrir son dossier suspension · annulation' : '♿ Ouvrir son dossier ' + (gf === 'regul' ? 'de régularisation' : 'de permis aménagé')) +
      ' <span style="font-weight:400;font-size:12px;opacity:.85;">(formation ' + esc(formationDe(nom)) + ')</span></button>';
    h += siens.map(d => {
      const e = etat(d); const p = PARCOURS[d.parcours];
      return '<div data-dmouvrir="' + d.id + '" style="border:1px solid var(--line);border-radius:11px;padding:10px 12px;margin-bottom:8px;cursor:pointer;">' +
        '<strong style="font-size:15px;color:var(--cream);">' + p.em + ' ' + esc(p.t) + '</strong> <span style="font-size:11px;color:var(--muted);">' + e.faites + '/' + e.et.length + '</span>' +
        (e.suivante ? '<div style="font-size:13px;margin-top:4px;">➡️ ' + esc(e.suivante.t) + '</div>' : '<div style="font-size:13px;margin-top:4px;">✅ Dossier terminé</div>') + etatAlertes(d) + noteCourte(d) + '</div>';
    }).join('');
    h += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">' +
      '<button type="button" class="btn btn-secondary" data-dmnouveau="handicap" style="width:auto;margin:0;padding:9px 13px;font-size:13px;">➕ ♿ Permis aménagé</button>' +
      '<button type="button" class="btn btn-secondary" data-dmnouveau="susp" style="width:auto;margin:0;padding:9px 13px;font-size:13px;">➕ ⛔ Suspension · annulation</button></div>';
    corps.innerHTML = h;
    corps.querySelectorAll('[data-dmouvrir]').forEach(x => x.addEventListener('click', () => {
      const d = DOSSIERS.find(y => y.id === x.dataset.dmouvrir); if(!d) return;
      zoneRacine = corps; outil = outilDe(d); ouvert = d.id; retourDuDossier = liste; dessiner();
    }));
    corps.querySelectorAll('[data-dmnouveau]').forEach(b => b.addEventListener('click', () => {
      zoneRacine = corps; outil = b.dataset.dmnouveau; retourDuDossier = liste; assistant(nom);
    }));
    const bsf = $('#dmSelonForm', corps);
    if(bsf) bsf.addEventListener('click', () => { zoneRacine = corps; retourDuDossier = liste; ouvrirSelonLaFormation(nom, formationDe(nom), { ici: true }); });
  };
  retourDuDossier = liste;
  const siens = DOSSIERS.filter(x => memeEleve(x.eleve, nom));
  zoneRacine = corps;
  if(siens.length === 1){ outil = outilDe(siens[0]); ouvert = siens[0].id; dessiner(); }
  else liste();
};

/* ============================================================
   🔗 v1568 — LES FORMATIONS QUI OUVRENT UN DOSSIER

   David, le 25 novembre : « les dossiers handicap et les dossiers
   annulation suspension, il faut qu'on les lie aux dossiers élèves,
   et qu'on retrouve le suivi dans le dossier de l'élève ». Ses
   réponses : « le créer tout seul », « ouvrir sur l'onglet ♿
   Démarches », et pour le parcours « selon le cas ».

   · Régularisation BEA / BV → un dossier ♿ Régularisation, créé tout
     seul ; sa maladie se choisit ensuite dans le dossier.
   · Conduite aménagée BEA / BV → un dossier 🆕 Premier permis aménagé,
     créé tout seul.
   · Annulation / Suspension BEA / BV → la petite fenêtre : suspension
     ou annulation, sa durée ou ses dates, puis le dossier.
   Rien n'est créé quand il a déjà un dossier de ce côté-là qui n'est
   pas terminé, ni sans le droit d'écrire les démarches.
   ============================================================ */
const normF = (x) => String(x || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function genreDeFormation(f){
  const t = normF(f);
  if(/regularisation/.test(t)) return 'regul';
  if(/conduite amenagee/.test(t)) return 'premier';
  if(/annulation|suspension/.test(t)) return 'susp';
  return '';
}
function formationDe(nom){
  const f = (typeof ficheDe === 'function') ? ficheDe(nom) : null;
  return String((f && f.formation) || '').trim();
}
function sectionModifiableDM(){ return typeof sectionModifiable !== 'function' || !!sectionModifiable('demarches'); }
const parcoursDuGenre = (g) => g === 'susp' ? ['susp', 'annul'] : (g === 'premier' ? ['premier', 'regul'] : ['regul', 'premier']);
/* son dossier de ce côté-là, pas terminé (le plus récent) */
function dossierEnCours(nom, g){
  return DOSSIERS.filter(x => parcoursDuGenre(g).indexOf(x.parcours) !== -1 && memeEleve(x.eleve, nom) && etat(x).suivante)
    .sort((a, b) => String(b.majLe || b.creeLe || '').localeCompare(String(a.majLe || a.creeLe || '')))[0] || null;
}
async function ouvrirSelonLaFormation(nom, formation, o){
  o = o || {};
  const g = genreDeFormation(formation);
  if(!g || !nom || !sectionModifiableDM()) return null;
  try{ await chargerDemarches(); }catch(e){ return null; }
  const deja = dossierEnCours(nom, g);
  if(deja){ if(!o.ici) showToast((g === 'susp' ? '⛔' : '♿') + ' Son dossier ' + PARCOURS[deja.parcours].t.toLowerCase() + ' est déjà ouvert, dans ses Démarches'); return deja; }
  /* l'écran ♿ / ⛔ garde son état : on le range avant de prêter l'outil */
  garderEtat();
  const apres = (n) => {
    if(o.ici){ outil = outilDe(n); ouvert = n.id; dessiner(); }
    else if(document.getElementById(ZONES_DM[outilDe(n)]) && zoneRacine && zoneRacine.isConnected) dessiner();
  };
  if(g === 'susp'){
    prendreEtat('susp');
    if(!o.ici) zoneRacine = null;
    assistant(nom, { titre: '⛔ Son dossier suspension · annulation', plusTard: true, apres: apres,
      intro: '🔗 <b>' + esc(nom) + '</b> passe en formation <b>' + esc(formation) + '</b>. Dis-nous ce qui lui arrive : son dossier s’ouvre dans ses ♿ Démarches, et ses leçons suivent le bon parcours (reprise, ou permis à repasser).' });
    return null;
  }
  const n = await enregistrer({ id: '', eleve: nom, parcours: g, fait: {}, docs: {}, codes: [], situations: [] },
    '♿ Dossier ' + PARCOURS[g].t.toLowerCase() + ' ouvert dans ses Démarches');
  if(n) apres(n);
  return n;
}
window.demarchesSelonLaFormation = function(nom, formation, ancienne){
  const g = genreDeFormation(formation);
  if(!g || g === genreDeFormation(ancienne)) return Promise.resolve(null);
  return ouvrirSelonLaFormation(nom, formation, {});
};
window.formationAvecDemarches = genreDeFormation;

/* Son cas en annulation / suspension, pour le parcours de ses leçons
   (ec-questionnaire.js) : 'conduite' quand il repasse la conduite,
   'reprise' sinon, '' sans dossier (ou pas encore lu). */
window.casAnnulSusp = function(nom){
  if(!dmCharge) return '';
  const d = DOSSIERS.filter(x => (x.parcours === 'susp' || x.parcours === 'annul') && memeEleve(x.eleve, nom))
    .sort((a, b) => String(b.majLe || b.creeLe || '').localeCompare(String(a.majLe || a.creeLe || '')))[0];
  if(!d) return '';
  return (d.parcours === 'annul' && !regleAnnul(d).codeSeul) ? 'conduite' : 'reprise';
};

/* Le dossier de l'élève s'ouvre sur ♿ Démarches quand il en a un, ou
   quand sa formation en appelle un (David : « si on met un élève en
   formation Régularisation, il faut que ça ouvre directement dedans »).
   Pas encore lus : la lecture part, pour la prochaine fois. */
window.aDesDemarches = function(nom){
  if(typeof sectionVisible === 'function' && !sectionVisible('demarches')) return false;
  if(genreDeFormation(formationDe(nom))) return true;
  if(!dmCharge){ chargerDemarches().catch(() => {}); return false; }
  return DOSSIERS.some(x => memeEleve(x.eleve, nom));
};

/* ---- les cartes de cours et l'ancien résumé (ec-prepares.js) ----
   Le même lecteur pour tous : les dossiers du permis aménagé. */
window.chargerHandicapSiBesoin = (forcer) => chargerDemarches(forcer);
window.resumeHandicap = function(nom){
  const d = DOSSIERS.find(x => (x.parcours === 'regul' || x.parcours === 'premier') && memeEleve(x.eleve, nom));
  if(!d) return null;
  const e = etat(d);
  const fait = (k) => !!(d.fait[k] && d.fait[k] !== 'non');
  const m = MALADIES.find(x => x.id === d.maladie);
  const rdvEt = e.et.find(x => x.rdv);
  const dateRdv = d.rdv ? frDate(d.rdv) + (String(d.rdv).slice(11, 16) ? ' ' + String(d.rdv).slice(11, 16) : '') : '';
  return {
    ligne: d, eleve: d.eleve,
    nomRange: memeEleve(d.eleve, nom) && String(d.eleve).toLowerCase() !== String(nom || '').toLowerCase() ? d.eleve : '',
    parcours: PARCOURS[d.parcours].t,
    faites: e.et.filter(x => fait(x.cle)).length, total: e.et.length, fini: !e.suivante,
    pathologie: String(d.maladieTexte || (m ? m.t : '')).trim(),
    equipement: (d.codes || []).map(cd => cd + ' ' + ((CODE[cd] || {}).n || '')).join(', '),
    commentaire: String(d.notes || '').trim(),
    suivante: e.suivante ? e.suivante.t : '',
    etapes: e.et.map(x => ({ cle: x.cle, nom: x.t, court: x.t, fait: fait(x.cle), date: frDate(d.fait[x.cle]) })),
    ddtm: { envoye: fait('pieces'), date: dateRdv,
            aPrendre: d.parcours === 'regul' && !dateRdv && !(rdvEt && fait(rdvEt.cle)) }
  };
};
window.ligneHandicapCourte = function(r){
  if(!r) return '';
  const bouts = [r.parcours, r.faites + '/' + r.total + ' étapes'];
  if(r.ddtm.date) bouts.push('📋 ' + (r.ligne.parcours === 'regul' ? 'DDTM' : 'Examen') + ' le ' + r.ddtm.date);
  else if(r.ddtm.aPrendre) bouts.push('📋 RDV DDTM à prendre');
  if(r.suivante) bouts.push('➡️ ' + r.suivante);
  if(r.equipement) bouts.push(r.equipement);
  return bouts.join(' · ');
};

})();

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-handicap.js'] = true;
