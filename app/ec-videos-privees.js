/* Déployé le 26/11/2026 à 15:14 — v1587 */
/* ============================================================
   ec-videos-privees.js — 🎬 v1587
   LES VIDÉOS DES COMPTES PRINCIPAUX

   David, le 26/11 : « fais-moi la vidéo pour Chrystel et moi, mais il
   faut qu'il n'y ait que nous deux et Maryne qui puissent la voir ».
   Une vidéo par onglet, sans voix, un texte sous chaque écran.

   ⚠️ L'ENTRÉE DU MENU NE FAIT PAS LA SÉCURITÉ. Elle n'apparaît que
   pour David, Chrystel et Maryne, mais c'est le Worker qui décide
   (videosPriveesPour) : la liste et ses liens signés ne partent que
   vers ces trois comptes. Les fichiers sont dans le compartiment R2,
   jamais dans le dossier videos/ du site.

   Déposer et retirer : David et Chrystel (administrateurs). Le dépôt
   passe par le même chemin que les vidéos des guides
   (deposerUnFichier, ec-parcours.js). Le titre vient du nom du
   fichier, et un numéro en tête (« 03-… ») donne l'ordre.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

const VIDEOS_PRIVEES_QUI = ['david', 'chrystel', 'maryne'];

function videosPriveesPourMoi(){
  const nom = (typeof ACCES === 'object' && ACCES && ACCES.moniteur) ? String(ACCES.moniteur) : '';
  const prenom = (typeof normaliserMot === 'function' ? normaliserMot(nom) : nom.toLowerCase()).split(/\s+/)[0];
  return !!prenom && VIDEOS_PRIVEES_QUI.indexOf(prenom) !== -1;
}

/* L'entrée du menu ⋯ : seulement pour eux trois */
function majVideosPriveesBtn(){
  const b = document.getElementById('videosPriveesBtn');
  if(!b) return;
  const oui = videosPriveesPourMoi();
  b.style.display = oui ? 'flex' : 'none';
}

/* « 03-Élèves.mp4 » → titre « Élèves », ordre 3 */
function titreDeVideoPrivee(nom){
  const base = String(nom || '').replace(/\.mp4$/i, '');
  const m = base.match(/^(\d+)\s*[-_. ]\s*(.*)$/);
  return { ordre: m ? Number(m[1]) : 0, titre: (m ? m[2] : base).replace(/[_]+/g, ' ').trim() || 'Vidéo' };
}

let videosPriveesEtat = null;

async function ouvrirVideosPrivees(){
  const fond = document.createElement('div');
  fond.className = 'overlay show';
  const boite = document.createElement('div');
  boite.className = 'modal';
  boite.style.cssText = 'max-width:min(980px, 96vw);max-height:92vh;overflow-y:auto;';
  fond.appendChild(boite);
  document.body.appendChild(fond);
  const fermer = () => { fond.querySelectorAll('video').forEach(v => { try{ v.pause(); }catch(e){} }); fond.remove(); };
  fond.addEventListener('click', (e) => { if(e.target === fond) fermer(); });

  const dessiner = (message) => {
    boite.innerHTML = '';
    const tete = document.createElement('div');
    tete.style.cssText = 'display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px;';
    const h = document.createElement('h3');
    h.style.margin = '0';
    h.textContent = '🎬 Les vidéos des comptes principaux';
    const x = document.createElement('button');
    x.type = 'button'; x.className = 'btn btn-secondary';
    x.style.cssText = 'width:auto;margin:0;padding:8px 12px;font-size:13px;';
    x.textContent = '✕ Fermer';
    x.addEventListener('click', fermer);
    tete.append(h, x);
    boite.appendChild(tete);
    const sous = document.createElement('div');
    sous.style.cssText = 'font-size:13px;color:var(--muted);line-height:1.5;margin-bottom:12px;';
    sous.textContent = 'Toute l’App, onglet par onglet. Réservées à David, Chrystel et Maryne : personne d’autre ne peut les ouvrir.';
    boite.appendChild(sous);
    if(message){
      const m = document.createElement('div');
      m.style.cssText = 'font-size:13px;margin:6px 0 10px;color:var(--accent-text);';
      m.textContent = message;
      boite.appendChild(m);
    }
    const E = videosPriveesEtat;
    if(!E){ const c = document.createElement('div'); c.className = 'empty'; c.textContent = 'Lecture…'; boite.appendChild(c); return; }
    if(!E.videos.length){
      const c = document.createElement('div'); c.className = 'empty';
      c.textContent = E.peutDeposer ? 'Aucune vidéo pour l’instant : dépose-les avec le bouton ci-dessous.' : 'Aucune vidéo pour l’instant.';
      boite.appendChild(c);
    }
    E.videos.forEach(v => {
      const d = document.createElement('details');
      d.style.cssText = 'border:1px solid var(--line);border-radius:12px;padding:8px 12px;margin:0 0 10px;';
      const s = document.createElement('summary');
      s.style.cssText = 'cursor:pointer;font-weight:700;font-size:15px;';
      s.textContent = '▶️ ' + v.titre;
      d.appendChild(s);
      d.addEventListener('toggle', () => {
        if(!d.open){ d.querySelectorAll('video').forEach(x => { try{ x.pause(); }catch(e){} }); return; }
        if(d.querySelector('video')) return;
        const vid = document.createElement('video');
        vid.controls = true; vid.preload = 'metadata'; vid.playsInline = true;
        vid.src = CONFIG.WORKER_URL + v.lien;
        vid.style.cssText = 'width:100%;border-radius:10px;background:#000;display:block;margin-top:8px;';
        d.appendChild(vid);
        if(E.peutDeposer){
          const r = document.createElement('button');
          r.type = 'button'; r.className = 'btn btn-secondary';
          r.style.cssText = 'width:auto;margin:8px 0 2px;padding:7px 11px;font-size:12.5px;';
          r.textContent = '🗑️ Retirer cette vidéo';
          r.addEventListener('click', async () => {
            const ok = (typeof confirmer === 'function') ? await confirmer('Retirer « ' + v.titre + ' » ? Le fichier est effacé du stockage.') : true;
            if(!ok) return;
            try{
              videosPriveesEtat = await appelPrep({ action: 'videosPriveesPoser', quoi: 'retirer', cle: v.cle });
              dessiner('🗑️ « ' + v.titre + ' » retirée.');
            }catch(e){ dessiner('⚠️ ' + (e.message || e)); }
          });
          d.appendChild(r);
        }
      });
      boite.appendChild(d);
    });
    if(E.peutDeposer){
      const zone = document.createElement('div');
      zone.style.cssText = 'border-top:1px dashed var(--line);margin-top:12px;padding-top:12px;';
      const lab = document.createElement('label');
      lab.className = 'btn btn-secondary';
      lab.style.cssText = 'display:inline-flex;align-items:center;gap:8px;width:auto;margin:0;padding:10px 14px;font-size:13.5px;cursor:pointer;';
      lab.textContent = '⬆️ Déposer des vidéos (MP4)';
      const inp = document.createElement('input');
      inp.type = 'file'; inp.accept = 'video/mp4,.mp4'; inp.multiple = true; inp.style.display = 'none';
      lab.appendChild(inp);
      const etat = document.createElement('div');
      etat.style.cssText = 'font-size:12.5px;color:var(--muted);margin-top:8px;line-height:1.5;';
      etat.textContent = 'Le titre vient du nom du fichier ; un numéro en tête (« 03-… ») donne l’ordre.';
      inp.addEventListener('change', async () => {
        const fichiers = [...inp.files];
        if(!fichiers.length) return;
        lab.style.pointerEvents = 'none'; lab.style.opacity = '.6';
        let fait = 0;
        for(const f of fichiers){
          const t = titreDeVideoPrivee(f.name);
          try{
            const cle = await deposerUnFichier('video', f, (p) => { etat.textContent = '⬆️ ' + t.titre + ' — ' + p + ' % (' + (fait + 1) + ' sur ' + fichiers.length + ')'; });
            videosPriveesEtat = await appelPrep({ action: 'videosPriveesPoser', quoi: 'ajouter', cle: cle, titre: t.titre, ordre: t.ordre });
            fait++;
          }catch(e){
            etat.textContent = '⚠️ ' + t.titre + ' : ' + (e.message || e);
            lab.style.pointerEvents = ''; lab.style.opacity = '';
            return;
          }
        }
        dessiner('✅ ' + fait + ' vidéo(s) déposée(s).');
      });
      zone.append(lab, etat);
      boite.appendChild(zone);
    }
  };

  videosPriveesEtat = null;
  dessiner();
  try{
    videosPriveesEtat = await appelPrep({ action: 'videosPriveesLire' });
    dessiner();
  }catch(e){
    videosPriveesEtat = { videos: [], peutDeposer: false };
    dessiner('⚠️ ' + (e.message || e));
  }
}

(function(){
  const b = document.getElementById('videosPriveesBtn');
  if(b) b.addEventListener('click', (e) => { e.preventDefault(); ouvrirVideosPrivees(); });
  majVideosPriveesBtn();
  /* La session s'ouvre après le chargement : on regarde de temps en temps (rien n'est appelé au serveur) */
  setInterval(majVideosPriveesBtn, 2000);
})();

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-videos-privees.js'] = true;
