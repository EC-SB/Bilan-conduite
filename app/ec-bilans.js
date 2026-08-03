/* ============================================================
   ec-bilans.js
   Les textes fixes des bilans, modifiables depuis l'application.
   Ce qui est calculé — frise, manœuvres cumulées, numéro de leçon,
   rubriques d'erreurs — reste calculé : seuls les textes changent.
   Les modifications valent pour les deux modes, vocal et manuel.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* Les textes que l'on peut réécrire, et où ils apparaissent.
   La clé sert à retrouver le texte ; « chemin » dit quoi remplacer. */
const TEXTES_BILAN = [
  { cle:'bilan_entete',        nom:'En-tête du bilan',
    ou:'Tout en haut de chaque bilan de conduite',
    lire:() => BLOC.entete,
    ecrire:(v) => { BLOC.entete = v; } },

  { cle:'bilan_cartesd',       nom:'Carte SD',
    ou:'Le paragraphe sur la caméra et le visionnage des cours',
    aide:'La coche ✅ ou ❌ est ajoutée automatiquement après le titre.',
    lire:() => "N'oublie pas de la regarder et si soucis demande nous !! " +
      '(rappel, tous tes cours sont filmés, par une caméra avant et une arrière, ' +
      'avec le son et les conseils des moniteurs, pour revoir tout ton cours de conduite, ' +
      'avant de revenir à ton prochain cours). ',
    ecrire:(v) => {
      const t = String(v);
      BLOC.carteSD = c => '𝘾𝙖𝙧𝙩𝙚 𝙎𝘿  ' + st(c) + '\n' + t;
    } },

  { cle:'bilan_installation',  nom:'Installation, passager, voyants',
    ou:'Le bloc des trois vérifications et son lien Facebook',
    aide:'Utilise {i} {p} {v} pour placer les coches, et garde les liens.',
    lire:() =>
      '𝙄𝙣𝙨𝙩𝙖𝙡𝙡𝙖𝙩𝙞𝙤𝙣  {i}https://www.facebook.com/groups/963972327360861/permalink/969918630099564/\n' +
      '𝙋𝙖𝙨𝙨𝙖𝙜𝙚𝙧 {p}\n' +
      '𝙑𝙤𝙮𝙖𝙣𝙩𝙨 {v}\n' +
      '/2 points jour du permis ',
    ecrire:(v) => {
      const t = String(v);
      BLOC.installPassVoyants = (i, p, vo) =>
        t.split('{i}').join(st(i)).split('{p}').join(st(p)).split('{v}').join(st(vo));
    } },

  { cle:'bilan_verifications', nom:'Vérifications',
    ou:'Le bloc des vérifications et son lien Facebook',
    lire:() => BLOC.verifications,
    ecrire:(v) => { BLOC.verifications = v; } },

  { cle:'bilan_manoeuvres',    nom:'Liste des manœuvres — fiche véhicule',
    ou:'Les manœuvres proposées, une par ligne',
    aide:"L'ordre est respecté. Une manœuvre retirée disparaît des bilans à venir.",
    liste:true,
    lire:() => BLOC.ficheListeConduite.join('\n'),
    ecrire:(v) => {
      const l = String(v).split('\n').map(x => x.trim()).filter(Boolean);
      if(l.length) BLOC.ficheListeConduite = l;
    } },

  { cle:'bilan_rubriques',     nom:"Rubriques d'erreurs",
    ou:'Les catégories du résumé, en vocal comme en manuel',
    aide:'Une rubrique par ligne, émoji compris. Elles servent aussi au bilan manuel.',
    liste:true,
    lire:() => (typeof THEMES_ERREURS !== 'undefined')
      ? THEMES_ERREURS.map(t => t.nom).join('\n') : '',
    ecrire:(v) => {
      if(typeof THEMES_ERREURS === 'undefined') return;
      const l = String(v).split('\n').map(x => x.trim()).filter(Boolean);
      if(!l.length) return;
      THEMES_ERREURS.length = 0;
      l.forEach((nom, i) => THEMES_ERREURS.push({ cle: 'r' + i, nom: nom }));
    } }
];

/* Ce qui reste calculé, et qu'on ne peut donc pas réécrire ici */
const CALCULE_NON_MODIFIABLE = [
  'La frise de formation et le numéro de leçon',
  'Les manœuvres déjà validées, cumulées depuis les cours précédents',
  "Le contenu des erreurs, dicté par le moniteur ou résumé par l'IA",
  'Les totaux du CEPC et le calcul éliminatoire'
];


/* ---------- Application des textes enregistrés ---------- */

let textesBilanCharges = false;

async function appliquerTextesBilan(){
  try{
    if(typeof chargerModelesTexte !== 'function') return;
    await chargerModelesTexte();
    (modelesTexte || []).forEach(m => {
      const t = TEXTES_BILAN.find(x => x.cle === m.usage);
      if(t && m.contenu) {
        try{ t.ecrire(m.contenu); }catch(e){ console.warn('Texte ' + t.cle + ' :', e); }
      }
    });
    textesBilanCharges = true;
  }catch(e){
    console.warn('Textes de bilan indisponibles :', e);
  }
}


/* ---------- Interface ---------- */

async function afficherTextesBilan(){
  const zone = $('bilansZone');
  if(!zone) return;

  zone.innerHTML = '<div class="empty">Chargement des textes…</div>';
  await chargerModelesTexte();
  zone.innerHTML = '';

  /* Ce qui n'est pas modifiable, dit d'emblée */
  const info = document.createElement('details');
  info.innerHTML = '<summary style="cursor:pointer;font-size:12px;color:var(--muted);' +
    'margin-bottom:10px;">Ce qui reste calculé automatiquement</summary>';
  const li = document.createElement('div');
  li.style.cssText = 'font-size:12px;color:var(--muted);line-height:1.7;margin-bottom:12px;';
  li.innerHTML = CALCULE_NON_MODIFIABLE.map(x => '• ' + x).join('<br>');
  info.appendChild(li);
  zone.appendChild(info);

  TEXTES_BILAN.forEach(t => {
    const enregistre = (modelesTexte || []).find(m => m.usage === t.cle);
    const actuel = enregistre ? enregistre.contenu : t.lire();
    const modifie = !!enregistre;

    const d = document.createElement('details');
    d.style.cssText = 'border:1px solid var(--line);border-radius:10px;padding:10px 12px;' +
      'margin-bottom:8px;' + (modifie ? 'border-color:var(--orange);' : '');

    const som = document.createElement('summary');
    som.style.cssText = 'cursor:pointer;font-size:15px;font-weight:700;color:var(--cream);' +
      'list-style:none;';
    som.innerHTML = (t.liste ? '📋 ' : '✍️ ') + t.nom +
      (modifie ? ' <span style="font-size:11px;color:var(--accent-text);">· modifié</span>' : '');
    d.appendChild(som);

    const ou = document.createElement('div');
    ou.style.cssText = 'font-size:12px;color:var(--muted);margin:6px 0;line-height:1.5;';
    ou.textContent = t.ou + (t.aide ? ' — ' + t.aide : '');
    d.appendChild(ou);

    const zt = document.createElement('textarea');
    zt.rows = t.liste ? 10 : 6;
    zt.value = actuel;
    zt.style.cssText = 'width:100%;background:var(--navy);border:1px solid var(--line);' +
      'color:var(--cream);padding:11px 12px;border-radius:10px;font-size:14px;' +
      'line-height:1.6;font-family:inherit;resize:vertical;margin-bottom:10px;';
    d.appendChild(zt);

    const r = document.createElement('div');
    r.style.cssText = 'display:flex;gap:8px;';

    const bEnr = document.createElement('button');
    bEnr.className = 'btn btn-primary';
    bEnr.style.cssText = 'flex:1;padding:9px;font-size:13px;margin:0;';
    bEnr.textContent = '💾 Enregistrer';
    bEnr.addEventListener('click', async () => {
      const v = zt.value.trim();
      if(!v){ showToast('Le texte est vide.'); return; }
      bEnr.disabled = true;
      bEnr.textContent = 'Enregistrement…';
      try{
        await appelPrep({
          action: 'modeleSet',
          id: enregistre ? enregistre.id : '',
          usage: t.cle,
          nom: t.nom,
          contenu: v
        });
        t.ecrire(v);
        showToast('Texte enregistré ✅');
        afficherTextesBilan();
      }catch(e){
        showToast('Erreur : ' + e.message);
        bEnr.disabled = false;
        bEnr.textContent = '💾 Enregistrer';
      }
    });
    r.appendChild(bEnr);

    if(modifie){
      const bRaz = document.createElement('button');
      bRaz.className = 'btn btn-secondary';
      bRaz.style.cssText = 'width:auto;padding:9px 12px;font-size:13px;margin:0;';
      bRaz.textContent = '↩️ Texte d\'origine';
      bRaz.title = "Revenir au texte proposé par l'application";
      bRaz.addEventListener('click', async () => {
        if(!await confirmer('Revenir au texte d\'origine pour « ' + t.nom + ' » ?')) return;
        bRaz.disabled = true;
        try{
          await appelPrep({ action: 'modeleDelete', id: enregistre.id });
          showToast('Texte d\'origine rétabli — recharge la page pour le voir appliqué');
          afficherTextesBilan();
        }catch(e){ showToast('Erreur : ' + e.message); bRaz.disabled = false; }
      });
      r.appendChild(bRaz);
    }

    d.appendChild(r);
    zone.appendChild(d);
  });

  const pied = document.createElement('div');
  pied.style.cssText = 'font-size:11px;color:var(--muted);margin-top:12px;line-height:1.6;';
  pied.textContent = "Les textes modifiés s'appliquent aux prochains bilans, " +
    'en enregistrement vocal comme en saisie manuelle. ' +
    'Les bilans déjà enregistrés ne changent pas.';
  zone.appendChild(pied);
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-bilans.js'] = true;
