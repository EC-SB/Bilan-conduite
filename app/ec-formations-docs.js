/* Déployé le 27/10/2026 à 16:17 — v1280 */
/* ============================================================
   ec-formations-docs.js — 💼 LES DOCUMENTS DES FORMATIONS ENTREPRISE (v1280)

   Devis, programme, convention, lettre pour l'OPCO, convocations,
   règlement intérieur, feuilles de présence, attestations de fin de
   formation, certificats de réalisation : sur le papier à en-tête
   des ✉️ Courriers (même logo, même police, mêmes marges), remplis
   avec le dossier.

   ⚠️ CE QUE DEMANDENT LES FINANCEURS EST ÉCRIT ICI, PAS DANS LA TÊTE.
   La convention porte les mentions de l'article L6353-1 et du modèle
   du Centre Inffo (nature de l'action, moyens, suivi, sanction, prix,
   dédit, différends, n° de déclaration d'activité et de certificat
   Qualiopi) ; la feuille de présence se signe à chaque séance — et
   par demi-journée — par chaque stagiaire ET par le formateur
   (jurisprudence de la cour administrative d'appel de Nantes, 2021) ;
   le certificat de réalisation reprend le modèle du ministère du
   Travail. Un document qui oublie l'une de ces mentions fait refuser
   un financement.

   Un document est une liste de blocs (titre, paragraphe, tableau,
   signatures…) que « feFabriquerPdf » pose page par page.
   ============================================================ */

const FE_PT = 0.3527778;
const FE_CORPS = 10.5;          /* la taille du texte des documents (pt) */
const FE_INTER = 1.3;

/* ---------- petits outils ---------- */
function feArr(x){ return Math.round((Number(x) || 0) * 100) / 100; }
function feEur(x){ return feArr(x).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/ /g, ' ') + ' €'; }
function feNb(x){ return String(feArr(x)).replace('.', ','); }
function feHeures(h){ h = Number(h) || 0; const hh = Math.floor(h), mm = Math.round((h - hh) * 60); return mm ? hh + ' h ' + String(mm).padStart(2, '0') : hh + ' h'; }
const FE_MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const FE_JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
function feIso(d){ return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function feAujourdhui(){ return feIso(new Date()); }
function feDateFr(iso){ const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
function feDateLongue(iso, avecJour){
  const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if(!m) return '';
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return (avecJour ? FE_JOURS[d.getDay()] + ' ' : '') + (+m[3] === 1 ? '1er' : +m[3]) + ' ' + FE_MOIS[+m[2] - 1] + ' ' + m[1];
}
function feHeure(h){ const m = String(h || '').match(/^(\d{1,2}):(\d{2})/); return m ? (+m[1]) + 'h' + m[2] : ''; }
function feMinutes(h){ const m = String(h || '').match(/^(\d{1,2}):(\d{2})/); return m ? +m[1] * 60 + +m[2] : null; }
function feDureeSeance(s){ const a = feMinutes(s.debut), b = feMinutes(s.fin); return a !== null && b !== null && b > a ? (b - a) / 60 : 0; }

/* ---------- les calculs du prix ----------
   Les lignes de 💰 Tarifs portent un prix TTC ; une ligne à la main est
   écrite HT. Le TTC d'un pack reste exact (David) : le HT d'un bloc se
   déduit de son TTC, et la dernière ligne absorbe l'arrondi. */
function feTva(o){ const t = Number(o && o.tva); return isFinite(t) ? t : 20; }
function feHtDe(ttc, tva){ return ttc / (1 + tva / 100); }
function feBloc(lignes, tva){
  const ttc = feArr(lignes.reduce((s, l) => s + (Number(l.q) || 0) * (Number(l.ttc) || 0), 0));
  const ht = feArr(feHtDe(ttc, tva));
  const totaux = lignes.map(l => feArr(feHtDe((Number(l.q) || 0) * (Number(l.ttc) || 0), tva)));
  if(totaux.length){
    const autres = totaux.slice(0, -1).reduce((s, x) => s + x, 0);
    totaux[totaux.length - 1] = feArr(ht - autres);
  }
  return { ttc: ttc, ht: ht, totaux: totaux };
}
function feEffectif(d){ return Math.max((d.stagiaires || []).length, Number(d.formation && d.formation.effectif) || 0, 0); }
function feTotaux(d, o){
  const tva = feTva(o);
  const l = (d.prix && d.prix.lignes) || [];
  const sal = feBloc(l.filter(x => x.bloc !== 'groupe'), tva);
  const grp = feBloc(l.filter(x => x.bloc === 'groupe'), tva);
  const n = feEffectif(d);
  const ttc = feArr(n * sal.ttc + grp.ttc);
  const ht = feArr(feHtDe(ttc, tva));
  return { n: n, tva: tva, sal: sal, grp: grp, ttc: ttc, ht: ht, montantTva: feArr(ttc - ht) };
}

/* ---------- les heures d'un stagiaire ----------
   Les séances passées où il était inscrit et pas noté absent ; un
   nombre écrit à la main dans le dossier passe devant. */
function feSeancesDe(d, st){ return (d.seances || []).filter(s => !s.stagiaires || !s.stagiaires.length || s.stagiaires.indexOf(st.id) !== -1); }
function feHeuresFaites(d, st, jusqua){
  if(st.heures !== undefined && st.heures !== null && st.heures !== '') return Number(st.heures) || 0;
  const j = jusqua || feAujourdhui();
  return feArr(feSeancesDe(d, st).filter(s => s.date && s.date <= j && (s.absents || []).indexOf(st.id) === -1).reduce((x, s) => x + feDureeSeance(s), 0));
}

/* ============================================================
   LE MOTEUR : des blocs → des pages sur le papier à en-tête
   ============================================================ */
function feRuns(texte){
  /* « **gras** » dans un texte */
  const out = [];
  String(texte == null ? '' : texte).split(/(\*\*[^*]+\*\*)/).forEach(m => {
    if(!m) return;
    if(/^\*\*[^*]+\*\*$/.test(m)) out.push({ t: m.slice(2, -2), b: true });
    else out.push({ t: m, b: false });
  });
  return out;
}
function feLignes(doc, runs, largeur, taille){
  const mots = [];
  runs.forEach(r => {
    doc.setFont('CarlitoEC', r.b ? 'bold' : (r.i ? 'italic' : 'normal')); doc.setFontSize(taille);
    (r.t.match(/\n|[ \t]+|[^\s]+/g) || []).forEach(m => {
      mots.push({ t: m, r: r, w: m === '\n' ? 0 : doc.getTextWidth(m), esp: /^[ \t]+$/.test(m), nl: m === '\n' });
    });
  });
  const lignes = [];
  let ligne = [], l = 0;
  const pousser = () => { while(ligne.length && ligne[ligne.length - 1].esp) ligne.pop(); lignes.push(ligne); ligne = []; l = 0; };
  mots.forEach(m => {
    if(m.nl){ pousser(); return; }
    if(m.esp && !ligne.length) return;
    if(!m.esp && l + m.w > largeur + 0.01 && ligne.length) pousser();
    if(!m.esp && m.w > largeur){
      let bout = '';
      [...m.t].forEach(ch => {
        doc.setFont('CarlitoEC', m.r.b ? 'bold' : 'normal');
        if(doc.getTextWidth(bout + ch) > largeur && bout){ ligne.push({ t: bout, r: m.r, w: doc.getTextWidth(bout), esp: false }); pousser(); bout = ch; }
        else bout += ch;
      });
      if(bout){ const w = doc.getTextWidth(bout); ligne.push({ t: bout, r: m.r, w: w, esp: false }); l += w; }
      return;
    }
    ligne.push(m); l += m.w;
  });
  pousser();
  return lignes;
}
function feEcrireLigne(doc, ligne, x, base, largeur, align, taille){
  const total = ligne.reduce((s, m) => s + m.w, 0);
  if(align === 'right') x += largeur - total;
  else if(align === 'center') x += (largeur - total) / 2;
  ligne.forEach(m => {
    if(!m.esp){ doc.setFont('CarlitoEC', m.r.b ? 'bold' : (m.r.i ? 'italic' : 'normal')); doc.setFontSize(taille); doc.text(m.t, x, base); }
    x += m.w;
  });
}
function feImageType(src){ return /^data:image\/jpe?g/i.test(String(src)) ? 'JPEG' : 'PNG'; }

async function feFabriquerPdf(docs, entete){
  const jsPDF = await chargerJsPDF();
  await crChargerRessources();
  const res = CR.res;
  const e = entete || (FE.d && FE.d.entetes && FE.d.entetes.sb) || null;
  if(!e) throw new Error('En-tête introuvable');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  [['normal', 'normal'], ['bold', 'bold'], ['italic', 'italic'], ['bolditalic', 'bolditalic']].forEach(([k, st]) => {
    doc.addFileToVFS('CarlitoEC-' + k + '.ttf', res.polices[k]);
    doc.addFont('CarlitoEC-' + k + '.ttf', 'CarlitoEC', st);
  });
  const X0 = CR_MM.marge, L = CR_LARGEUR_CORPS;
  const tete = () => {
    doc.addImage(res.logo, 'PNG', CR_MM.largeur - CR_MM.marge - CR_MM.logoL, CR_MM.marge - 0.5, CR_MM.logoL, CR_MM.logoH, 'logo', 'FAST');
    let y = CR_MM.marge;
    doc.setTextColor(0, 0, 0);
    const ligne = (t, taille, style) => {
      const h = taille * CR_MM.interligne * FE_PT;
      doc.setFont('CarlitoEC', style); doc.setFontSize(taille);
      doc.text(t, X0, crBase(y, h, taille));
      y += h;
    };
    const badge = () => { doc.addImage(res.tel, 'PNG', X0, y + CR_MM.telMarge, CR_MM.telL, CR_MM.telH, 'tel', 'FAST'); y += CR_MM.telH + 2 * CR_MM.telMarge; };
    ligne(e.titre, CR_MM.nomPt, 'bold');
    (e.lignes || []).forEach(l => ligne(l, CR_MM.lignePt, 'normal'));
    const web = () => [e.mail, e.web].filter(Boolean).forEach(t => ligne(t, CR_MM.lignePt, 'normal'));
    if(e.telApres){ web(); badge(); } else { badge(); web(); }
  };
  const pied = () => {
    let y = crHautPied(e);
    doc.setFont('CarlitoEC', 'normal'); doc.setFontSize(CR_MM.piedPt); doc.setTextColor(0, 0, 0);
    const h = CR_MM.piedPt * CR_MM.piedInterligne * FE_PT;
    (e.pied || []).forEach(l => { doc.text(l, CR_MM.largeur / 2, crBase(y, h, CR_MM.piedPt), { align: 'center' }); y += h; });
  };
  const haut = crHautCorps(e) - 4, bas = crBasCorps(e) + 4;
  const pagesDe = [];
  let premiere = true;

  for(const d of docs){
    if(!premiere) doc.addPage();
    premiere = false;
    const debut = doc.getNumberOfPages();
    tete(); pied();
    let y = haut;
    const place = h => { if(y + h > bas){ doc.addPage(); tete(); pied(); y = haut; return true; } return false; };
    const hLigne = t => t * FE_INTER * FE_PT;

    const paragraphe = (texte, o) => {
      o = o || {};
      const t = o.taille || FE_CORPS;
      const x = X0 + (o.x || 0), larg = L - (o.x || 0);
      const lignes = feLignes(doc, typeof texte === 'string' ? feRuns(texte) : texte, larg, t);
      doc.setTextColor.apply(doc, o.gris ? [90, 90, 90] : [0, 0, 0]);
      lignes.forEach(li => {
        const h = hLigne(t);
        place(h);
        feEcrireLigne(doc, li, x, crBase(y, h, t), larg, o.align || 'left', t);
        y += h;
      });
      doc.setTextColor(0, 0, 0);
    };
    const tableau = (b) => {
      const t = b.taille || 10;
      const cols = b.cols;
      const largeurs = cols.map(c => c.w);
      const libre = L - largeurs.filter(Boolean).reduce((s, w) => s + w, 0);
      const sansW = largeurs.filter(w => !w).length;
      const W = largeurs.map(w => w || libre / Math.max(1, sansW));
      const pad = 1.4;
      const ligneDe = (cells, o) => {
        o = o || {};
        const contenus = cells.map((c, i) => {
          const runs = typeof c === 'object' && c && c.runs ? c.runs : feRuns(c == null ? '' : String(c));
          if(o.gras) runs.forEach(r => { r.b = true; });
          return feLignes(doc, runs, W[i] - 2 * pad, t);
        });
        const nb = Math.max(1, ...contenus.map(c => c.length));
        let h = nb * hLigne(t) + 2 * pad;
        if(o.hMin) h = Math.max(h, o.hMin);
        return { contenus, h, o };
      };
      const dessiner = (r) => {
        let x = X0;
        r.contenus.forEach((li, i) => {
          if(r.o.fond || (b.fondCle && i === 0)){ doc.setFillColor(236, 236, 236); doc.rect(x, y, W[i], r.h, 'F'); }
          doc.setDrawColor(150, 150, 150); doc.setLineWidth(0.2); doc.rect(x, y, W[i], r.h);
          let yy = y + pad;
          li.forEach(l => { const h = hLigne(t); feEcrireLigne(doc, l, x + pad, crBase(yy, h, t), W[i] - 2 * pad, (cols[i] && cols[i].align) || 'left', t); yy += h; });
          x += W[i];
        });
        (r.o.images || []).forEach(im => {
          if(!im) return;
          const iw = Math.min(W[im.col] - 4, 30), ih = r.h - 6;
          try{ doc.addImage(im.src, feImageType(im.src), X0 + W.slice(0, im.col).reduce((s, w) => s + w, 0) + (W[im.col] - iw) / 2, y + 1.5, iw, ih, undefined, 'FAST'); }catch(err){}
        });
        y += r.h;
      };
      const entete = b.entete ? ligneDe(b.entete, { fond: true, gras: true }) : null;
      if(entete){ place(entete.h + 8); dessiner(entete); }
      (b.lignes || []).forEach((cells, k) => {
        const o = Object.assign({ hMin: b.hMin }, (b.styles && b.styles[k]) || {});
        const r = ligneDe(cells, o);
        if(place(r.h) && entete) dessiner(ligneDe(b.entete, { fond: true, gras: true }));
        dessiner(r);
      });
      y += 2;
    };

    for(const b of d.blocs){
      if(b.t === 'titre'){ y += 1; paragraphe('**' + b.texte + '**', { taille: 15, align: 'center' }); }
      else if(b.t === 'sous'){ paragraphe(b.texte, { taille: 9.5, align: 'center', gris: true }); y += 2; }
      else if(b.t === 'h'){ y += 2.5; if(y + 3 * hLigne(FE_CORPS) > bas) place(999); paragraphe('**' + b.texte + '**', { taille: 11 }); y += 0.6; }
      else if(b.t === 'p'){ paragraphe(b.texte, { align: b.align, gris: b.gris, taille: b.taille }); y += b.serre ? 0 : 1.4; }
      else if(b.t === 'puces'){
        (b.items || []).filter(Boolean).forEach(it => {
          const t = FE_CORPS, h = hLigne(t);
          place(h);
          doc.setFont('CarlitoEC', 'normal'); doc.setFontSize(t);
          doc.text('•', X0 + 2, crBase(y, h, t));
          paragraphe(it, { x: 6 });
        });
        y += 1.4;
      }
      else if(b.t === 'kv') tableau({ cols: [{ w: b.largeurCle || 48 }, {}], lignes: b.lignes, styles: b.lignes.map(() => ({})), taille: 10,
                                       fondCle: true, entete: null, _kv: true });
      else if(b.t === 'table') tableau(b);
      else if(b.t === 'espace') y += b.h || 4;
      else if(b.t === 'coches'){
        (b.items || []).forEach(([oui, texte]) => {
          const t = FE_CORPS, h = hLigne(t);
          place(h);
          const c = 3.2, yc = y + (h - c) / 2;
          doc.setDrawColor(0, 0, 0); doc.setLineWidth(0.25); doc.rect(X0 + 1, yc, c, c);
          if(oui){ doc.line(X0 + 1.5, yc + 0.5, X0 + 1 + c - 0.5, yc + c - 0.5); doc.line(X0 + 1 + c - 0.5, yc + 0.5, X0 + 1.5, yc + c - 0.5); }
          paragraphe(texte, { x: 7 });
        });
        y += 1.4;
      }
      else if(b.t === 'signatures'){
        const h = b.hauteur || 30;
        place(h + 2);
        const w = (L - 8) / 2;
        b.cases.forEach((c, i) => {
          if(!c) return;
          const x = X0 + i * (w + 8);
          let yy = y;
          [c.titre, c.nom, c.detail].filter(Boolean).forEach((t, k) => {
            const tt = k === 0 ? 10 : 9.5, hh = hLigne(tt);
            doc.setFont('CarlitoEC', k === 0 ? 'bold' : 'normal'); doc.setFontSize(tt); doc.setTextColor(0, 0, 0);
            doc.text(String(t), x, crBase(yy, hh, tt)); yy += hh;
          });
          doc.setDrawColor(170, 170, 170); doc.setLineWidth(0.2); doc.rect(x, yy + 1, w, h - (yy - y) - 1);
          if(c.image){ try{ doc.addImage(c.image, feImageType(c.image), x + 3, yy + 2.5, Math.min(w - 6, 52), h - (yy - y) - 4, undefined, 'FAST'); }catch(err){} }
        });
        y += h + 3;
      }
      else if(b.t === 'saut'){ doc.addPage(); tete(); pied(); y = haut; }
    }
    pagesDe.push({ debut: debut, fin: doc.getNumberOfPages(), ref: d.ref || '' });
  }
  /* la référence et la page, en bas de chaque page */
  pagesDe.forEach(p => {
    const n = p.fin - p.debut + 1;
    for(let k = p.debut; k <= p.fin; k++){
      doc.setPage(k);
      doc.setFont('CarlitoEC', 'normal'); doc.setFontSize(CR_MM.piedPt); doc.setTextColor(120, 120, 120);
      const yb = crBase(crHautPied(e) - 5.5, CR_MM.piedPt * CR_MM.interligne * FE_PT, CR_MM.piedPt);
      if(p.ref) doc.text('Réf. ' + p.ref, X0, yb);
      if(n > 1) doc.text((k - p.debut + 1) + ' / ' + n, CR_MM.largeur - CR_MM.marge, yb, { align: 'right' });
      doc.setTextColor(0, 0, 0);
    }
  });
  doc.setProperties({ title: docs.length === 1 ? docs[0].titre : 'Formation', creator: 'Évolution Conduites' });
  return doc;
}

/* ============================================================
   LES DOCUMENTS
   ============================================================ */
function feOrganismeLignes(o){
  return o.raison + ', nom commercial ' + o.nomCommercial + ', ' + o.adresse + ' · Siret ' + o.siret +
    ' · déclaration d’activité n° ' + o.nda + ' auprès du préfet de la région ' + o.region +
    (o.qualiopi ? ' · certification Qualiopi n° ' + o.qualiopi + (o.qualiopiFin ? ' (valable jusqu’au ' + feDateFr(o.qualiopiFin) + ')' : '') : '');
}
function feEntrepriseLignes(d){
  const e = d.entreprise || {};
  return [e.nom, e.adresse, [e.cp, e.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ') + (e.siret ? ' · Siret ' + e.siret : '');
}
function feDates(f){
  if(f.dateDebut && f.dateFin && f.dateDebut !== f.dateFin) return 'du ' + feDateLongue(f.dateDebut) + ' au ' + feDateLongue(f.dateFin);
  if(f.dateDebut) return 'le ' + feDateLongue(f.dateDebut, true);
  return 'à convenir avec l’entreprise';
}
function feOpcoNom(d){ return (d.opco && d.opco.nom) || 'votre OPCO'; }
function feSignatureOF(d, o, titre){
  const img = d.signatureImage && FE.d && (FE.d.images || []).find(i => String(i.id) === String(d.signatureImage));
  return { titre: titre || 'Pour l’organisme de formation', nom: o.signataire + ', ' + o.fonction, image: img ? img.donnees : '' };
}
function feLignesDevis(d, o){
  const t = feTotaux(d, o);
  const lignes = [], styles = [];
  const ajouter = (cells, st) => { lignes.push(cells); styles.push(st || {}); };
  const bloc = (nom, liste, b) => {
    if(!liste.length) return;
    ajouter([{ runs: [{ t: nom, b: true }] }, '', '', ''], { fond: true });
    liste.forEach((l, i) => ajouter([l.lib + (l.packNom ? '' : ''), feNb(l.q), feEur(feHtDe(l.ttc, t.tva)), feEur(b.totaux[i])]));
  };
  const L = (d.prix && d.prix.lignes) || [];
  const sal = L.filter(x => x.bloc !== 'groupe'), grp = L.filter(x => x.bloc === 'groupe');
  bloc('Par salarié', sal, t.sal);
  if(sal.length) ajouter(['Par salarié', '', '', feEur(t.sal.ht)], { gras: true });
  if(sal.length && t.n > 1) ajouter(['× ' + t.n + ' salariés', '', '', feEur(feHtDe(t.n * t.sal.ttc, t.tva))], {});
  bloc('Pour le groupe', grp, t.grp);
  ajouter(['Total HT', '', '', feEur(t.ht)], { gras: true });
  ajouter(['TVA ' + feNb(t.tva) + ' %', '', '', feEur(t.montantTva)], {});
  ajouter(['Total TTC', '', '', feEur(t.ttc)], { gras: true, fond: true });
  return { t: 'table', cols: [{}, { w: 16, align: 'center' }, { w: 26, align: 'right' }, { w: 28, align: 'right' }],
           entete: ['Prestation', 'Qté', 'PU HT', 'Total HT'], lignes: lignes, styles: styles, taille: 9.5 };
}
function feProgrammeTable(f){
  return { t: 'table', cols: [{ w: 18, align: 'center' }, { w: 62 }, {}], entete: ['Durée', 'Module', 'Contenu'],
           lignes: (f.programme || []).map(p => [feHeures(p.h), '**' + (p.titre || '') + '**', p.detail || '']), taille: 9.5 };
}

const FE_DOCS = {
  devis(d, o, x){
    const f = d.formation || {}, e = d.entreprise || {};
    const opco = d.financement === 'opco';
    return { titre: 'Devis', ref: x.numero + '-D', blocs: [
      { t: 'titre', texte: 'DEVIS DE FORMATION' },
      { t: 'sous', texte: 'Réf. ' + x.numero + '-D · établi le ' + feDateFr(feAujourdhui()) + ' · valable deux mois' },
      { t: 'kv', lignes: [['Client', feEntrepriseLignes(d)], ['À l’attention de', [e.signataire, e.fonction].filter(Boolean).join(', ')],
                          ['Formation', '**' + (f.intitule || '') + '**'], ['Public', feEffectif(d) + ' salarié' + (feEffectif(d) > 1 ? 's' : '') + (f.public ? ' · ' + f.public : '')],
                          ['Durée', feHeures(f.duree) + ' par salarié'], ['Dates', feDates(f)], ['Lieu', f.lieu || o.lieu], ['Modalité', f.modalite || 'Présentiel']] },
      { t: 'h', texte: 'Tarification' },
      feLignesDevis(d, o),
      { t: 'p', texte: opco ? '**Financement** : prise en charge possible par ' + feOpcoNom(d) + ' au titre du plan de développement des compétences. La demande est déposée par l’entreprise, sur son espace OPCO, **avant le début de la formation**.'
                            : '**Financement** : la formation est réglée directement par l’entreprise.' },
      { t: 'p', texte: '**Règlement** : par virement à réception de la facture, à l’issue de la formation, à ' + o.paiement + '.' },
      { t: 'p', gris: true, taille: 9, texte: feOrganismeLignes(o) + '.' },
      { t: 'signatures', cases: [feSignatureOF(d, o), { titre: 'Bon pour accord — l’entreprise', nom: 'Date, nom, signature et cachet' }] }
    ] };
  },
  programme(d, o, x){
    const f = d.formation || {};
    return { titre: 'Programme', ref: x.numero + '-P', blocs: [
      { t: 'titre', texte: 'PROGRAMME DE FORMATION' },
      { t: 'sous', texte: f.intitule || '' },
      { t: 'kv', lignes: [['Intitulé', '**' + (f.intitule || '') + '**'], ['Nature de l’action', (f.nature || 'Action de formation') + ' (article L6313-1 du Code du travail)'],
                          ['Public et prérequis', f.public || ''], ['Durée', feHeures(f.duree) + ' par stagiaire'], ['Modalité', f.modalite || 'Présentiel'],
                          ['Lieu', f.lieu || o.lieu], ['Dates', feDates(f)], ['Effectif', String(feEffectif(d) || '')]] },
      { t: 'h', texte: 'Objectifs' },
      { t: 'puces', items: String(f.objectifs || '').split(/\n+/).map(s => s.trim()) },
      { t: 'h', texte: 'Contenu' },
      feProgrammeTable(f),
      { t: 'h', texte: 'Moyens pédagogiques et techniques' }, { t: 'p', texte: f.moyens || '' },
      { t: 'h', texte: 'Suivi et évaluation' }, { t: 'p', texte: (f.evaluation || '') + ' Une feuille de présence est signée par chaque stagiaire et par le formateur à chaque séance.' },
      { t: 'h', texte: 'Sanction de la formation' }, { t: 'p', texte: f.sanction || 'Attestation de fin de formation' },
      { t: 'h', texte: 'Accessibilité et délai d’accès' },
      { t: 'p', texte: 'Formation accessible aux personnes en situation de handicap : nous contacter pour l’adapter' + (o.referentHandicap ? ' (référent handicap : ' + o.referentHandicap + ')' : '') + '. Délai d’accès : dates convenues avec l’entreprise.' },
      { t: 'p', gris: true, taille: 9, texte: feOrganismeLignes(o) + '.' }
    ] };
  },
  convention(d, o, x){
    const f = d.formation || {}, e = d.entreprise || {};
    const t = feTotaux(d, o);
    const sta = (d.stagiaires || []).map(s => s.nom + (s.fonction ? ' (' + s.fonction + ')' : '')).join(', ');
    const subro = d.financement === 'opco' && d.opco && d.opco.subrogation === 'opco';
    return { titre: 'Convention', ref: x.numero, blocs: [
      { t: 'titre', texte: 'CONVENTION DE FORMATION PROFESSIONNELLE' },
      { t: 'sous', texte: '(articles L6353-1 et D6353-1 du Code du travail) · Réf. ' + x.numero },
      { t: 'h', texte: 'Entre les soussignés' },
      { t: 'p', texte: '**L’organisme de formation** : ' + feOrganismeLignes(o) + ' · représenté par ' + o.signataire + ', ' + o.fonction + '.' },
      { t: 'p', texte: '**Et l’entreprise** : ' + feEntrepriseLignes(d) + (e.signataire ? ' · représentée par ' + e.signataire + (e.fonction ? ', ' + e.fonction : '') : '') + '.' },
      { t: 'h', texte: 'Article 1 – Objet et caractéristiques de l’action' },
      { t: 'p', texte: 'Intitulé : **' + (f.intitule || '') + '** · Nature : ' + (f.nature || 'action de formation').toLowerCase() + ' (article L6313-1 du Code du travail).' },
      { t: 'p', texte: 'Objectifs : ' + String(f.objectifs || '').split(/\n+/).filter(Boolean).join(' ') + (f.public ? ' Public et prérequis : ' + f.public : '') },
      { t: 'p', texte: 'Contenu (programme détaillé en annexe) : ' + (f.programme || []).map(p => feHeures(p.h) + ' ' + String(p.titre || '').toLowerCase()).join(' · ') + '.' },
      { t: 'p', texte: 'Moyens : ' + (f.moyens || '') },
      { t: 'p', texte: 'Durée : **' + feHeures(f.duree) + ' par salarié** · Dates : ' + feDates(f) + ' · Lieu : ' + (f.lieu || o.lieu) + ' · Modalité : ' + (f.modalite || 'présentiel').toLowerCase() + '.' },
      { t: 'h', texte: 'Article 2 – Effectif formé' },
      { t: 'p', texte: feEffectif(d) + ' salarié' + (feEffectif(d) > 1 ? 's' : '') + (sta ? ' : ' + sta : '') + '.' },
      { t: 'h', texte: 'Article 3 – Déroulement et suivi' },
      { t: 'p', texte: 'Formation en ' + (f.modalite || 'présentiel').toLowerCase() + '. Une feuille de présence est signée par chaque stagiaire et par le formateur à chaque séance, et au moins par demi-journée.' },
      { t: 'h', texte: 'Article 4 – Évaluation et sanction' },
      { t: 'p', texte: (f.evaluation || '') + ' Une attestation de fin de formation et un certificat de réalisation sont remis pour chaque salarié' + (f.sanction ? ' (' + f.sanction + ')' : '') + '.' },
      { t: 'h', texte: 'Article 5 – Dispositions financières' },
      feLignesDevis(d, o),
      { t: 'h', texte: 'Article 6 – Règlement' },
      { t: 'p', texte: 'Par virement à réception de la facture, à l’issue de la formation, à ' + o.paiement + '.' +
          (d.financement === 'opco' ? (subro ? ' La prise en charge est demandée à ' + feOpcoNom(d) + ' avec subrogation : la facture lui est adressée, la part non prise en charge reste due par l’entreprise.'
                                             : ' L’entreprise règle la formation et en demande le remboursement à ' + feOpcoNom(d) + '.') : '') },
      { t: 'h', texte: 'Article 7 – Dédit ou abandon' },
      { t: 'p', texte: 'En cas de dédit de l’entreprise moins de ' + o.deditJours + ' jours francs avant le début de la formation, ' + o.deditPct + ' % du prix reste dû à titre de dédommagement ; cette somme n’est pas imputable sur la participation au développement de la formation professionnelle. En cas d’abandon en cours de formation, seules les heures réalisées sont facturées.' },
      { t: 'h', texte: 'Article 8 – Différends' },
      { t: 'p', texte: 'À défaut d’accord amiable, le tribunal de commerce de ' + o.tribunal + ' est seul compétent.' },
      { t: 'p', texte: 'Fait à Saint-Brieuc, en deux exemplaires, le ' + feDateFr(feAujourdhui()) + '.' },
      { t: 'signatures', cases: [feSignatureOF(d, o), { titre: 'Pour l’entreprise — bon pour accord', nom: [e.signataire, e.fonction].filter(Boolean).join(', ') || 'Nom, fonction', detail: 'Signature et cachet' }] }
    ] };
  },
  lettreOpco(d, o, x){
    const f = d.formation || {};
    const t = feTotaux(d, o);
    return { titre: 'Lettre pour la demande OPCO', ref: x.numero + '-O', blocs: [
      { t: 'titre', texte: 'DEMANDE DE PRISE EN CHARGE — ' + String(feOpcoNom(d)).toUpperCase() },
      { t: 'sous', texte: 'À l’attention de ' + ((d.entreprise && d.entreprise.nom) || 'l’entreprise') },
      { t: 'p', texte: 'Madame, Monsieur,' },
      { t: 'p', texte: 'Dans le cadre du développement des compétences de vos salariés, nous vous transmettons la convention et le programme de l’action suivante, à joindre à votre demande de prise en charge :' },
      { t: 'kv', lignes: [['Intitulé', '**' + (f.intitule || '') + '**'], ['Nature de l’action', (f.nature || 'Action de formation') + ' (article L6313-1)'],
                          ['Public', feEffectif(d) + ' salarié' + (feEffectif(d) > 1 ? 's' : '')], ['Durée', feHeures(f.duree) + ' par salarié'],
                          ['Dates', feDates(f)], ['Coût total', feEur(t.ht) + ' HT · ' + feEur(t.ttc) + ' TTC'],
                          ['Organisme de formation', o.raison + ' (' + o.nomCommercial + ') · Siret ' + o.siret + ' · déclaration d’activité n° ' + o.nda + (o.qualiopi ? ' · Qualiopi n° ' + o.qualiopi : '')]] },
      { t: 'p', texte: 'La demande se dépose sur votre espace adhérent ' + feOpcoNom(d) + ' (ou auprès de votre conseiller formation), **avant le début de la formation**, avec la convention signée et le programme.' },
      { t: 'p', texte: 'Nous restons à votre disposition pour toute pièce complémentaire.' },
      { t: 'signatures', cases: [feSignatureOF(d, o), null] }
    ] };
  },
  convocation(d, o, x, st){
    const f = d.formation || {};
    const ses = feSeancesDe(d, st).filter(s => s.date).sort((a, b) => (a.date + a.debut).localeCompare(b.date + b.debut));
    return { titre: 'Convocation ' + st.nom, ref: x.numero + '-C', blocs: [
      { t: 'titre', texte: 'CONVOCATION À UNE FORMATION' },
      { t: 'sous', texte: st.nom },
      { t: 'p', texte: 'Madame, Monsieur ' + st.nom + ',' },
      { t: 'p', texte: 'Votre employeur, ' + ((d.entreprise && d.entreprise.nom) || '') + ', vous inscrit à la formation **« ' + (f.intitule || '') + ' »** organisée par ' + o.nomCommercial + '.' },
      { t: 'kv', lignes: [['Dates', feDates(f)], ['Lieu', f.lieu || o.lieu], ['Durée', feHeures(f.duree)], ['Formateur', f.formateur || 'enseignant de la conduite et de la sécurité routière'],
                          ['À apporter', 'Votre permis de conduire et une pièce d’identité']] },
      ses.length ? { t: 'h', texte: 'Vos séances' } : { t: 'espace', h: 1 },
      ses.length ? { t: 'table', cols: [{ w: 60 }, { w: 34 }, {}], entete: ['Date', 'Horaires', 'Contenu'],
                     lignes: ses.map(s => [feDateLongue(s.date, true), feHeure(s.debut) + ' – ' + feHeure(s.fin), s.contenu || '']), taille: 9.5 } : { t: 'espace', h: 1 },
      { t: 'p', texte: 'Le règlement intérieur est joint à cette convocation. Vous signerez la feuille de présence à chaque séance. Un empêchement : prévenez-nous au plus tôt, ainsi que votre employeur.' },
      { t: 'signatures', cases: [feSignatureOF(d, o), null] }
    ] };
  },
  reglement(d, o, x){
    const blocs = [{ t: 'titre', texte: 'RÈGLEMENT INTÉRIEUR' }, { t: 'sous', texte: o.nomCommercial + ' — organisme de formation · déclaration d’activité n° ' + o.nda }];
    String(o.reglement || '').split(/\n\s*\n/).forEach(par => {
      const l = par.split('\n');
      if(/^Article\b/i.test(l[0])){ blocs.push({ t: 'h', texte: l[0] }); if(l.slice(1).join(' ').trim()) blocs.push({ t: 'p', texte: l.slice(1).join(' ') }); }
      else blocs.push({ t: 'p', texte: par.replace(/\n/g, ' ') });
    });
    return { titre: 'Règlement intérieur', ref: '', blocs: blocs };
  },
  emargement(d, o, x, s){
    const f = d.formation || {};
    const tous = d.stagiaires || [];
    const sta = s.stagiaires && s.stagiaires.length ? tous.filter(z => s.stagiaires.indexOf(z.id) !== -1) : tous;
    const a = feMinutes(s.debut), b = feMinutes(s.fin);
    const deux = a !== null && b !== null && a < 12 * 60 && b > 13 * 60 + 30;
    const demi = deux ? 'journée' : (a !== null && a >= 12 * 60 ? 'après-midi' : 'matin');
    const toutes = (d.seances || []).slice().sort((p, q) => ((p.date || '') + (p.debut || '')).localeCompare((q.date || '') + (q.debut || '')));
    const rang = toutes.indexOf(s) + 1;
    return { titre: 'Feuille de présence ' + feDateFr(s.date), ref: x.numero + '-E' + rang, blocs: [
      { t: 'titre', texte: 'FEUILLE DE PRÉSENCE' },
      { t: 'sous', texte: 'Réf. ' + x.numero + ' · séance ' + rang + ' / ' + toutes.length },
      { t: 'kv', lignes: [['Intitulé', (f.intitule || '') + ' (' + (f.nature || 'action de formation').toLowerCase() + ')'], ['Entreprise', (d.entreprise && d.entreprise.nom) || ''],
                          ['Date', feDateLongue(s.date, true) + ' — ' + demi], ['Horaires', feHeure(s.debut) + ' – ' + feHeure(s.fin) + ' (' + feHeures(feDureeSeance(s)) + ')'],
                          ['Contenu', s.contenu || ''], ['Lieu', s.lieu || f.lieu || o.lieu], ['Formateur', ((s.formateur || f.formateur) ? (s.formateur || f.formateur) + ', ' : '') + 'enseignant de la conduite et de la sécurité routière']] },
      { t: 'espace', h: 2 },
      deux ? { t: 'table', cols: [{ w: 48 }, {}, { w: 40, align: 'center' }, { w: 40, align: 'center' }], entete: ['Stagiaire', 'Fonction', 'Signature matin', 'Signature après-midi'],
               lignes: sta.map(z => [z.nom, z.fonction || '', '', '']), hMin: 14, taille: 10 }
           : { t: 'table', cols: [{ w: 48 }, {}, { w: 18, align: 'center' }, { w: 18, align: 'center' }, { w: 48, align: 'center' }], entete: ['Stagiaire', 'Fonction', 'Arrivée', 'Départ', 'Signature'],
               lignes: sta.map(z => [z.nom, z.fonction || '', feHeure(s.debut), feHeure(s.fin), '']), hMin: 14, taille: 10 },
      { t: 'espace', h: 3 },
      { t: 'signatures', hauteur: 24, cases: [{ titre: 'Signature du formateur', nom: s.formateur || f.formateur || '' }, null] },
      { t: 'p', gris: true, taille: 9, texte: 'Chaque stagiaire signe à chaque séance (et au moins par demi-journée) ; une signature manquante ne se complète pas après coup.' }
    ] };
  },
  attestation(d, o, x, st){
    const f = d.formation || {};
    const h = feHeuresFaites(d, st);
    return { titre: 'Attestation ' + st.nom, ref: x.numero + '-A', blocs: [
      { t: 'titre', texte: 'ATTESTATION DE FIN DE FORMATION' },
      { t: 'sous', texte: '(article L6353-1 du Code du travail)' },
      { t: 'p', texte: 'Je soussigné(e), ' + o.signataire + ', ' + o.fonction + ' de ' + o.raison + ' (' + o.nomCommercial + '), organisme de formation enregistré sous le n° de déclaration d’activité ' + o.nda + ', atteste que :' },
      { t: 'kv', lignes: [['Stagiaire', '**' + st.nom + '**'], ['Fonction', st.fonction || ''], ['Entreprise', (d.entreprise && d.entreprise.nom) || '']] },
      { t: 'p', texte: 'a suivi la formation suivante :' },
      { t: 'kv', lignes: [['Intitulé', '**' + (f.intitule || '') + '**'], ['Nature de l’action', (f.nature || 'Action de formation') + ' (article L6313-1)'],
                          ['Dates', feDates(f)], ['Durée suivie', feHeures(h) + ' sur ' + feHeures(f.duree) + ' prévues'], ['Lieu', f.lieu || o.lieu]] },
      { t: 'h', texte: 'Objectifs' }, { t: 'puces', items: String(f.objectifs || '').split(/\n+/).map(s => s.trim()) },
      { t: 'h', texte: 'Résultats de l’évaluation des acquis' }, { t: 'p', texte: st.resultat || 'Évaluation réalisée tout au long de la formation par le formateur.' },
      { t: 'p', texte: 'Fait à Saint-Brieuc, le ' + feDateFr(feAujourdhui()) + '.' },
      { t: 'signatures', cases: [feSignatureOF(d, o, 'Pour l’organisme de formation'), null] }
    ] };
  },
  certificat(d, o, x, st){
    const f = d.formation || {};
    const h = feHeuresFaites(d, st);
    return { titre: 'Certificat de réalisation ' + st.nom, ref: x.numero + '-R', blocs: [
      { t: 'titre', texte: 'CERTIFICAT DE RÉALISATION' },
      { t: 'espace', h: 3 },
      { t: 'p', texte: 'Je soussigné(e) **' + o.signataire + '**, représentant légal du dispensateur de l’action concourant au développement des compétences **' + o.raison + '** (' + o.nomCommercial + '),' },
      { t: 'p', texte: 'atteste que : **' + st.nom + '**' },
      { t: 'p', texte: 'salarié(e) de l’entreprise **' + ((d.entreprise && d.entreprise.nom) || '') + '**' },
      { t: 'p', texte: 'a suivi l’action **' + (f.intitule || '') + '**' },
      { t: 'p', texte: 'Nature de l’action concourant au développement des compétences :' },
      { t: 'coches', items: [[true, 'action de formation'], [false, 'bilan de compétences'], [false, 'action de VAE'], [false, 'action de formation par apprentissage']] },
      { t: 'p', texte: 'qui s’est déroulée du **' + feDateFr(f.dateDebut) + '** au **' + feDateFr(f.dateFin || f.dateDebut) + '**' },
      { t: 'p', texte: 'pour une durée de **' + feNb(h) + ' heures**.' },
      { t: 'p', texte: 'Sans préjudice des délais imposés par les règles fiscales, comptables ou commerciales, je m’engage à conserver l’ensemble des pièces justificatives qui ont permis d’établir le présent certificat pendant une durée de 3 ans à compter de la fin de l’année du dernier paiement. En cas de cofinancement des fonds européens, la durée de conservation est étendue conformément aux obligations conventionnelles spécifiques.' },
      { t: 'p', texte: 'Fait à : Saint-Brieuc · Le : ' + feDateFr(feAujourdhui()) },
      { t: 'signatures', cases: [feSignatureOF(d, o, 'Cachet et signature du responsable du dispensateur de formation'), null] }
    ] };
  }
};

/* Les documents d'un dossier, prêts à fabriquer */
function feDocument(cle, x, extra){
  const o = FE.d.organisme;
  return FE_DOCS[cle](x.donnees, o, x, extra);
}
async function fePdfB64(docs){
  const doc = await feFabriquerPdf(docs);
  return doc.output('datauristring').split(',')[1];
}
function feNomPdf(titre, x){
  return ((titre || 'Document') + ' - ' + ((x.donnees.entreprise && x.donnees.entreprise.nom) || '') + ' - ' + x.numero)
    .normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 ._()-]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 90) + '.pdf';
}

/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-formations-docs.js'] = true;
