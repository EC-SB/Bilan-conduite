/* Déployé le 04/11/2026 à 10:43 — v1347 */
/* ============================================================
   ec-coffre.js
   🔐 Le coffre-fort des mots de passe — Gestion › L'outil (v1347).

   David : « j'utilise l'application Vision de Verifone pour faire les
   paiements au bureau… un générateur de mot de passe pour
   l'application car on oublie tout le temps le mot de passe que l'on
   a mis ou pas encore mis, donc en le cachant et qu'on puisse le voir
   dans notre app après avoir confirmé que c'est bien nous ».

   Ses réponses au schéma :
   · Gestion › L'outil, juste avant ⚙️ Accès ;
   · les administrateurs, et ceux dont on coche la case ;
   · le code de l'appli à chaque regard ;
   · 15 secondes à l'écran ;
   · « ⏳ Pas encore mis dans le logiciel » : le nouveau ET l'ancien,
     jusqu'à « ✅ C'est fait ».

   Le mot de passe ne vit dans la page que pendant ces 15 secondes :
   il n'est ni gardé en mémoire ensuite, ni rangé dans le téléphone.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

const CF = { lignes: [], modifier: false, cleCoffre: true, lu: false, erreur: '' };

function htmlCF(t){
  return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function quandCF(ms){
  if(!ms) return '';
  const d = new Date(ms);
  return d.toLocaleDateString('fr-FR') + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

async function afficherCoffre(){
  const z = $('coffreZone');
  if(!z) return;
  if(!CF.lu) z.innerHTML = '<div class="empty">Ouverture du coffre…</div>';
  try{
    prendreCF(await appelPrep({ action: 'coffreLire' }));
  }catch(e){
    CF.erreur = (e && e.message) || String(e);
  }
  dessinerCoffre();
}
function prendreCF(r){
  if(!r || r.status !== 'ok') throw new Error((r && r.message) || 'refusé');
  CF.lignes = r.lignes || [];
  CF.modifier = !!r.modifier;
  CF.cleCoffre = r.cleCoffre !== false;
  CF.lu = true;
  CF.erreur = '';
}

function dessinerCoffre(){
  const z = $('coffreZone');
  if(!z) return;
  z.innerHTML = '';
  if(!CF.lu){
    z.innerHTML = '<div class="empty">⚠️ ' + htmlCF(CF.erreur || 'Lecture impossible.') + '</div>';
    return;
  }
  const intro = document.createElement('div');
  intro.className = 'cfIntro';
  intro.textContent = 'Les mots de passe des logiciels de l’école. 👁️ Voir redemande ton code de l’appli, à chaque fois ; le mot de passe reste 15 secondes à l’écran.';
  z.appendChild(intro);

  if(!CF.cleCoffre){
    const a = document.createElement('div');
    a.className = 'cfAlerte';
    a.textContent = '⚠️ Le coffre n’est pas encore prêt : il manque le secret « COFFRE_CLE » dans les réglages du Worker (Cloudflare).';
    z.appendChild(a);
  }

  if(CF.modifier){
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'btn btn-primary cfAuto';
    b.textContent = '➕ Ajouter un mot de passe';
    b.addEventListener('click', () => ouvrirLigneCF(null));
    z.appendChild(b);
  }

  if(!CF.lignes.length){
    const v = document.createElement('div');
    v.className = 'empty';
    v.textContent = 'Le coffre est vide.';
    z.appendChild(v);
  }
  CF.lignes.forEach(l => z.appendChild(carteCF(l)));

  const j = document.createElement('button');
  j.type = 'button'; j.className = 'btn btn-secondary cfAuto cfJournalTout';
  j.textContent = '🕓 Tout le journal du coffre';
  j.addEventListener('click', () => journalCF(null));
  z.appendChild(j);
}

function boutonCF(texte, titre, quoi, cls){
  const b = document.createElement('button');
  b.type = 'button'; b.className = 'btn btn-secondary cfMini' + (cls ? ' ' + cls : '');
  b.textContent = texte;
  if(titre){ b.title = titre; b.setAttribute('aria-label', titre); }
  b.addEventListener('click', quoi);
  return b;
}

function carteCF(l){
  const c = document.createElement('div');
  c.className = 'cfCarte' + (l.enAttente ? ' cfAttente' : '');
  const tete = document.createElement('div');
  tete.className = 'cfTete';
  tete.innerHTML = '<strong>' + htmlCF(l.logiciel) + '</strong>' +
    (l.identifiant ? ' <span class="cfIdent">' + htmlCF(l.identifiant) + '</span>' : '');
  c.appendChild(tete);
  if(l.note){
    const n = document.createElement('div'); n.className = 'cfSous'; n.textContent = l.note; c.appendChild(n);
  }

  const rang = (lib, quoi) => {
    const r = document.createElement('div');
    r.className = 'cfRang';
    if(lib){ const s = document.createElement('span'); s.className = 'cfLib'; s.textContent = lib; r.appendChild(s); }
    const p = document.createElement('span'); p.className = 'cfPoints'; p.textContent = '••••••••••';
    r.appendChild(p);
    const act = document.createElement('span'); act.className = 'cfActions';
    act.appendChild(boutonCF('👁️ Voir', 'Voir le mot de passe' + (quoi === 'ancien' ? ' d’avant' : ''), () => voirCF(l, quoi)));
    r.appendChild(act);
    return { r: r, act: act };
  };

  if(!l.aUnMdp){
    const v = document.createElement('div'); v.className = 'cfSous'; v.textContent = 'Aucun mot de passe rangé.'; c.appendChild(v);
  }else if(l.enAttente){
    const a = document.createElement('div');
    a.className = 'cfBoiteAttente';
    a.innerHTML = '<div class="cfAttenteTitre">⏳ Pas encore mis dans le logiciel</div>';
    a.appendChild(rang('Nouveau', 'actuel').r);
    if(l.aUnAncien) a.appendChild(rang('Ancien', 'ancien').r);
    if(CF.modifier){
      const f = boutonCF('✅ C’est fait', 'Le nouveau est mis dans le logiciel', async ev => {
        ev.currentTarget.disabled = true;
        try{ prendreCF(await appelPrep({ action: 'coffreFait', id: l.id })); dessinerCoffre(); showToast('C’est noté ✅'); }
        catch(e){ showToast('Impossible : ' + e.message); ev.currentTarget.disabled = false; }
      }, 'cfFait');
      a.appendChild(f);
    }
    c.appendChild(a);
  }else{
    c.appendChild(rang('', 'actuel').r);
  }

  const outils = document.createElement('div');
  outils.className = 'cfOutils';
  if(CF.modifier) outils.appendChild(boutonCF('✏️', 'Modifier ou changer le mot de passe', () => ouvrirLigneCF(l)));
  outils.appendChild(boutonCF('🕓', 'Qui l’a regardé, copié, changé', () => journalCF(l)));
  if(l.aUnAncien && !l.enAttente) outils.appendChild(boutonCF('↩️ Celui d’avant', 'Voir le mot de passe précédent', () => voirCF(l, 'ancien')));
  c.appendChild(outils);

  const qui = [];
  if(l.changeLe) qui.push('changé le ' + quandCF(l.changeLe) + (l.changePar ? ' par ' + l.changePar : ''));
  if(l.vuLe) qui.push('regardé le ' + quandCF(l.vuLe) + (l.vuPar ? ' par ' + l.vuPar : ''));
  if(qui.length){ const q = document.createElement('div'); q.className = 'cfSous'; q.textContent = qui.join(' · '); c.appendChild(q); }
  return c;
}

/* « C'est bien toi ? » — le code de l'appli, puis 15 secondes */
function voirCF(l, quoi){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(440px, 95vw);';
  boite.innerHTML = '<h3>🔐 ' + htmlCF(l.logiciel) + (quoi === 'ancien' ? ' — le mot de passe d’avant' : '') + '</h3>' +
    '<p class="cfTexteModal">C’est bien toi ? Tape <strong>ton code de l’appli</strong>, celui de la connexion.</p>' +
    '<input type="password" id="cfConf" inputmode="numeric" autocomplete="off" class="cfConf">' +
    '<div class="cfErreur" id="cfErr"></div>' +
    '<div class="btn-row"><button class="btn btn-secondary" type="button" id="cfNon">Annuler</button>' +
    '<button class="btn btn-primary" type="button" id="cfOui">👁️ Voir</button></div>' +
    '<div id="cfVu"></div>';
  let minuterie = null;
  const fermer = () => {
    if(minuterie) clearInterval(minuterie);
    const v = boite.querySelector('.cfMdpVu'); if(v) v.textContent = '';
    fermerFond(fond);
    afficherCoffre();
  };
  boite.querySelector('#cfNon').addEventListener('click', fermer);
  const go = async () => {
    const b = boite.querySelector('#cfOui');
    const conf = boite.querySelector('#cfConf').value.trim();
    if(!conf) return;
    b.disabled = true;
    try{
      const d = await appelPrep({ action: 'coffreVoir', id: l.id, quoi: quoi, confirme: conf });
      if(!d || d.status !== 'ok') throw new Error((d && d.message) || 'refusé');
      boite.querySelector('#cfConf').value = '';
      boite.querySelector('#cfErr').textContent = '';
      let reste = Number(d.secondes) || 15;
      const z = boite.querySelector('#cfVu');
      z.innerHTML = '<div class="cfVuBloc"><code class="cfMdpVu"></code>' +
        '<div class="cfVuRang"><button class="btn btn-secondary cfMini" type="button" id="cfCopier">📋 Copier</button>' +
        '<span class="cfVide"></span><span class="cfSous" id="cfReste"></span>' +
        '<button class="btn btn-secondary cfMini" type="button" id="cfCacher" aria-label="Cacher">🙈</button></div></div>';
      z.querySelector('.cfMdpVu').textContent = d.mdp;
      z.querySelector('#cfCopier').addEventListener('click', async ev => {
        try{
          await navigator.clipboard.writeText(d.mdp);
          ev.currentTarget.textContent = '✅ Copié';
          appelPrep({ action: 'coffreNoter', id: l.id, quoi: quoi }).catch(() => {});
        }catch(e){ showToast('Copie impossible : sélectionne-le à la main.'); }
      });
      const maj = () => { const s = z.querySelector('#cfReste'); if(s) s.textContent = 'se recache dans ' + reste + ' s'; };
      maj();
      minuterie = setInterval(() => { reste--; if(reste <= 0) fermer(); else maj(); }, 1000);
      z.querySelector('#cfCacher').addEventListener('click', fermer);
    }catch(e){
      boite.querySelector('#cfErr').textContent = '⚠️ ' + e.message;
      b.disabled = false;
    }
  };
  boite.querySelector('#cfOui').addEventListener('click', go);
  boite.querySelector('#cfConf').addEventListener('keydown', ev => { if(ev.key === 'Enter') go(); });
  fond.appendChild(boite);
  document.body.appendChild(fond);
  setTimeout(() => boite.querySelector('#cfConf').focus(), 100);
}

/* 🎲 Un mot de passe solide : sans les caractères qu'on confond
   (0/O, 1/l/I), et au moins une majuscule, une minuscule, et un
   chiffre / un symbole s'ils sont demandés. */
function genererCF(n, chiffres, symboles){
  const maj = 'ABCDEFGHJKLMNPQRSTUVWXYZ', min = 'abcdefghijkmnopqrstuvwxyz', chi = '23456789', sym = '!#$%&*+-=?@_';
  const tirer = s => { const a = new Uint32Array(1); crypto.getRandomValues(a); return s[a[0] % s.length]; };
  const tout = maj + min + (chiffres ? chi : '') + (symboles ? sym : '');
  const out = [tirer(maj), tirer(min)];
  if(chiffres) out.push(tirer(chi));
  if(symboles) out.push(tirer(sym));
  while(out.length < n) out.push(tirer(tout));
  for(let i = out.length - 1; i > 0; i--){ const a = new Uint32Array(1); crypto.getRandomValues(a); const j = a[0] % (i + 1); [out[i], out[j]] = [out[j], out[i]]; }
  return out.join('');
}

/* ➕ / ✏️ */
function ouvrirLigneCF(l){
  const nouveau = !l;
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(520px, 95vw);max-height:90vh;overflow-y:auto;';
  boite.innerHTML = '<h3>' + (nouveau ? '➕ Un mot de passe de plus' : '✏️ ' + htmlCF(l.logiciel)) + '</h3>' +
    '<div class="duo"><div><label for="cfLog">Logiciel</label><input type="text" id="cfLog" value="' + htmlCF(l ? l.logiciel : '') + '" placeholder="Ex : Vision (Verifone)"></div>' +
    '<div><label for="cfId">Identifiant</label><input type="text" id="cfId" autocomplete="off" value="' + htmlCF(l ? l.identifiant : '') + '"></div></div>' +
    '<label for="cfNote">Note</label><input type="text" id="cfNote" value="' + htmlCF(l ? l.note : '') + '" placeholder="Ex : sur le PC de l’accueil">' +
    '<div class="cfSection">' + (nouveau || !l.aUnMdp ? '🔑 Le mot de passe' : '🔑 Changer le mot de passe') + '</div>' +
    (nouveau || !l.aUnMdp ? '' : '<p class="cfAideModal">Laisse vide pour garder l’actuel.</p>') +
    '<input type="text" id="cfMdp" autocomplete="off" spellcheck="false" class="cfMdpChamp" placeholder="Tape-le, ou 🎲 génère-le">' +
    '<div class="cfGen"><button type="button" class="btn btn-secondary cfMini" id="cfGen">🎲 Générer</button>' +
      '<select id="cfLong" class="cfLong"><option value="12">12 caractères</option><option value="16" selected>16 caractères</option><option value="20">20 caractères</option></select>' +
      '<label class="cfCoche"><input type="checkbox" id="cfChi" checked> chiffres</label>' +
      '<label class="cfCoche"><input type="checkbox" id="cfSym" checked> symboles</label></div>' +
    (nouveau || !l.aUnMdp ? '' :
      '<label class="cfCoche cfCocheLongue"><input type="checkbox" id="cfAtt"' + (l.enAttente ? ' checked' : '') + '> ⏳ Pas encore mis dans le logiciel — on garde le nouveau ET l’ancien jusqu’à « ✅ C’est fait »</label>') +
    '<p class="cfAideModal">⚠️ Le changer ici ne le change pas dans le logiciel : il faut aussi le changer là-bas.</p>';
  const q = s => boite.querySelector(s);
  q('#cfGen').addEventListener('click', () => {
    q('#cfMdp').value = genererCF(Number(q('#cfLong').value) || 16, q('#cfChi').checked, q('#cfSym').checked);
    if(q('#cfAtt')) q('#cfAtt').checked = true;
  });

  const r = document.createElement('div');
  r.className = 'btn-row';
  const bAnn = document.createElement('button');
  bAnn.className = 'btn btn-secondary'; bAnn.type = 'button'; bAnn.textContent = 'Annuler';
  bAnn.addEventListener('click', () => { q('#cfMdp').value = ''; fermerFond(fond); });
  r.appendChild(bAnn);
  if(!nouveau){
    const bSup = document.createElement('button');
    bSup.className = 'btn btn-secondary'; bSup.type = 'button'; bSup.textContent = '🗑️';
    bSup.style.cssText = 'color:var(--red);border-color:var(--red);';
    bSup.title = 'Retirer du coffre';
    bSup.addEventListener('click', async () => {
      if(!await confirmer('Retirer « ' + l.logiciel + ' » du coffre ?\n\nSon mot de passe et celui d’avant partent avec, sans retour.')) return;
      try{ prendreCF(await appelPrep({ action: 'coffreSupprimer', id: l.id })); fermerFond(fond); dessinerCoffre(); showToast('Retiré du coffre'); }
      catch(e){ showToast('Impossible : ' + e.message); }
    });
    r.appendChild(bSup);
  }
  const bOk = document.createElement('button');
  bOk.className = 'btn btn-primary'; bOk.type = 'button'; bOk.textContent = '💾 Enregistrer';
  bOk.addEventListener('click', async () => {
    const ligne = { id: l ? l.id : '', logiciel: q('#cfLog').value.trim(), identifiant: q('#cfId').value.trim(),
                    note: q('#cfNote').value.trim(), nouveau: q('#cfMdp').value, enAttente: q('#cfAtt') ? (q('#cfAtt').checked ? 1 : 0) : 0 };
    if(!ligne.logiciel){ showToast('Donne le nom du logiciel.'); return; }
    bOk.disabled = true; bOk.textContent = 'Enregistrement…';
    try{
      prendreCF(await appelPrep({ action: 'coffreEcrire', ligne: ligne }));
      q('#cfMdp').value = '';
      fermerFond(fond);
      dessinerCoffre();
      showToast('Rangé dans le coffre ✅');
    }catch(e){
      showToast('Impossible : ' + e.message);
      bOk.disabled = false; bOk.textContent = '💾 Enregistrer';
    }
  });
  r.appendChild(bOk);
  boite.appendChild(r);
  fond.appendChild(boite);
  document.body.appendChild(fond);
  setTimeout(() => q('#cfLog').focus(), 100);
}

/* 🕓 qui l'a regardé, copié, changé — et les codes faux */
async function journalCF(l){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(520px, 95vw);max-height:85vh;overflow-y:auto;';
  boite.innerHTML = '<h3>🕓 ' + (l ? htmlCF(l.logiciel) : 'Le journal du coffre') + '</h3><div id="cfJ"><div class="empty">Lecture…</div></div>' +
    '<div class="btn-row"><button class="btn btn-secondary" type="button" id="cfJF">Fermer</button></div>';
  boite.querySelector('#cfJF').addEventListener('click', () => fermerFond(fond));
  fond.appendChild(boite);
  document.body.appendChild(fond);
  const z = boite.querySelector('#cfJ');
  try{
    const d = await appelPrep({ action: 'coffreJournal', id: l ? l.id : '' });
    const j = (d && d.journal) || [];
    z.innerHTML = j.length ? '' : '<div class="empty">Rien pour l’instant.</div>';
    j.forEach(x => {
      const r = document.createElement('div');
      r.className = 'cfJLigne' + (x.quoi === 'code faux' ? ' cfJFaux' : '');
      r.innerHTML = '<span>' + htmlCF(quandCF(x.le)) + '</span><span><strong>' + htmlCF(x.qui) + '</strong> · ' + htmlCF(x.quoi) +
        (l ? '' : ' · ' + htmlCF(x.logiciel)) + '</span>';
      z.appendChild(r);
    });
  }catch(e){ z.innerHTML = '<div class="empty">⚠️ ' + htmlCF(e.message) + '</div>'; }
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-coffre.js'] = true;
