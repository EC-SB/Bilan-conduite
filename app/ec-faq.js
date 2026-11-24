/* Déployé le 24/11/2026 à 10:29 — v1548 */
/* ============================================================
   ec-faq.js — ❓ LES QUESTIONS FRÉQUENTES DES ÉLÈVES — v1548

   David, le 24 novembre : « les élèves posent plein de questions dont
   les réponses sont sur le groupe Évolution Conduites sur Facebook :
   prépare une sorte de FAQ qu'on mettrait sur leur app, il faut qu'on
   puisse mettre du texte, des vidéos, des images » — l'espace Drivup,
   notre App, Kopilote, un résumé de la formation code, un résumé de la
   formation conduite, le NEPH. Ses choix : un onglet dans la barre du
   bas ET une carte sur l'accueil + un rond ❓ en haut ; les admins ET le
   bureau écrivent ; je rédige les premiers textes d'après le groupe, en
   tutoyant.

   ⚠️ PAS UN ÉDITEUR DE PLUS. La FAQ est un groupe ❓ de « Groupes et
   guides » (voir LA FAQ DES ÉLÈVES dans le Worker) : cet écran est
   l'atelier des guides (ec-parcours.js) en « mode FAQ ». Un guide
   publié = un thème ; une étape = une question ; ses blocs = la réponse.

   « ➕ Créer la FAQ » pose le groupe et les premiers thèmes EN
   BROUILLON : rien ne part chez les élèves avant d'être relu et publié.
   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

function afficherFaqEquipe(){
  if(typeof parcoursModeFaq === 'undefined' || typeof afficherParcours !== 'function') return;
  parcoursModeFaq = true;
  afficherParcours();
}

/* Les premiers textes : tirés des publications du groupe Facebook
   (guides 3, 4, 5, 6, le message du 18/11 sur les applis, les rappels
   sur le NEPH, les horaires). Les vidéos se déposent ensuite dans
   chaque question, comme dans un guide. */
const FAQ_PREMIERS_THEMES = [
  { titre: '🚗 Ma formation', questions: [
    ['Comment se passe ma formation, du début à la fin ?',
     '[g]1. Le code[/g] : cours en salle, en visio ou en ligne sur Kopilote, puis l’examen du code.\n' +
     '[g]2. La théorie de la conduite[/g] : 3 heures en salle des tablettes, à réserver sur Drivup.\n' +
     '[g]3. La conduite[/g] : simulateur, écoutes pédagogiques et leçons en voiture.\n' +
     '[g]4. L’examen blanc[/g] : il dit combien d’heures il te reste avant le permis.\n' +
     '[g]5. Le permis[/g] : la date se donne quand tu as le niveau.\n\n' +
     'Entre chaque cours, tu travailles dans l’App : Réviser (les vidéos), Vérifs et Réciter.'],
    ['Résumé de la formation code',
     'Trois façons de suivre tes cours de code :\n' +
     '• [g]En salle[/g] : scanne le QR code de la séance avec ton téléphone, réponds aux questions, et tu vois tes erreurs à la fin de chaque série.\n' +
     '• [g]En visio[/g] : tu rejoins le cours depuis l’App, à l’heure de ta réservation.\n' +
     '• [g]En ligne[/g] : tes cours et tes tests se font sur l’application Kopilote.\n\n' +
     'Les cours de code en salle ou en visio se réservent sur Drivup.'],
    ['Résumé de la formation conduite',
     '• [g]La théorie de la conduite[/g] (3 h en salle des tablettes), à réserver sur Drivup.\n' +
     '• [g]Le simulateur[/g] : pour apprendre les bases (volant, pédales, vitesses).\n' +
     '• [g]Les écoutes pédagogiques[/g] : tu es à l’arrière pendant le cours d’un autre élève, tu regardes et tu écoutes.\n' +
     '• [g]Les leçons de conduite[/g] : à réserver sur Drivup. Avant chaque leçon, travaille ce que ton moniteur t’a demandé (bilan dans Réviser › Mes leçons).\n' +
     '• [g]Les vérifications[/g] : elles valent 3 points le jour de l’examen, entraîne-toi dans l’onglet Vérifs.\n' +
     '• [g]L’examen blanc[/g] : il décide des heures qu’il te reste avant le permis.'],
    ['C’est quoi « 6 + 3 » avant mon permis ?',
     'Après ton examen blanc, ton moniteur te dit combien d’heures il te reste, par exemple « 6 + 3 » :\n' +
     '• [g]6[/g] = 6 heures de leçons avant l’examen (3 leçons de 2 h) ;\n' +
     '• [g]+ 3[/g] = 2 heures la veille de l’examen + 1 heure le jour de l’examen.\n\n' +
     'Ces heures sont à réserver sur Drivup avant ton examen. Si tu ne trouves pas de créneau, écris-nous.'],
    ['Quand est-ce que je passe mon permis ?',
     'Quand tu as le niveau. Peu importe le nombre d’heures déjà faites : [g]sans le niveau, pas d’examen[/g] — on préfère rendre une place d’examen.\n\n' +
     'Pour y arriver plus vite : travaille ton code, tes procédures et tes vérifications entre les cours. Un cours peut être arrêté si le travail demandé n’a pas été fait.'],
    ['J’ai raté mon examen : qu’est-ce que je fais ?',
     'Pas de panique, ça arrive.\n' +
     '1. Remplis ton bilan dans l’App (onglet 📝 Bilan) : c’est obligatoire avant la suite.\n' +
     '2. On valide ton bilan, puis tu prends ton rendez-vous post-permis sur Drivup.\n' +
     '3. On fait le point ensemble sur les heures à refaire avant de repasser.'],
    ['J’ai eu mon permis : et maintenant ?',
     '• Télécharge ton certificat d’examen (CEPC) depuis ton espace Rendez-vous Permis : avec ta pièce d’identité, il vaut permis pendant 4 mois.\n' +
     '• Demande ton titre définitif sur le site de l’ANTS (gratuit), ou on s’en occupe pour 45 €.\n' +
     '• Passe récupérer ton disque A au bureau.\n' +
     '• Tu as 30 minutes de conduite offertes dans ta propre voiture.\n' +
     '• Pense à supprimer le mandat dans ton espace Rendez-vous Permis.\n' +
     '• Tu commences avec 6 points : la formation post-permis (entre 6 et 12 mois après) réduit ta période probatoire.'] ] },

  { titre: '📋 Administratif', questions: [
    ['C’est quoi le NEPH ?',
     'Le [g]NEPH[/g], c’est ton numéro d’inscription au permis de conduire. Tu l’as quand ton dossier d’inscription est validé par l’ANTS.\n\n' +
     '[g]Sans NEPH, pas de place d’examen[/g] : ni pour le code, ni pour la conduite.\n\n' +
     'Vérifie qu’il s’affiche sur l’accueil de ton compte Drivup.'],
    ['Qui fait mon dossier ANTS ?',
     'Deux cas :\n' +
     '• [g]C’est nous[/g] (option à 45 €, visible dans tes factures Drivup) : donne-nous toutes tes pièces. S’il en manque une, on te le dit.\n' +
     '• [g]C’est toi[/g] : fais ta demande sur le site de l’ANTS et envoie-nous ton NEPH dès que tu l’as, depuis l’onglet Écrire.'],
    ['Pourquoi installer France Identité ?',
     'France Identité est l’application officielle de l’État : ta carte d’identité (et plus tard ton permis) sur ton téléphone, en toute sécurité.\n\n' +
     'Si tu perds tes papiers juste avant l’examen, tu peux quand même le passer avec France Identité.\n\n' +
     'Il te faut une carte d’identité au format carte bancaire et un téléphone compatible (Android 11+ ou iOS 16+ avec NFC).\n' +
     '[france-identite.gouv.fr](https://france-identite.gouv.fr/)'],
    ['Comment payer ma formation ? Il y a des aides ?',
     'Plusieurs solutions existent : le CPF, le permis à 1 € par jour, l’aide de la Région Bretagne, des aides pour certains apprentis, et le paiement en plusieurs fois.\n\n' +
     'Si un financement est en cours pour toi, tu le suis sur l’accueil de l’App (carte 💶 Mon financement). Sinon, demande-nous depuis l’onglet Écrire : on regarde ce qui marche pour toi.'] ] },

  { titre: '📱 Drivup, l’App et Kopilote', questions: [
    ['À quoi sert chaque application ?',
     '• [g]Drivup[/g] : acheter et réserver tes cours (code et conduite), voir tes factures et ton livret d’apprentissage.\n' +
     '• [g]Kopilote[/g] : réviser ton code de la route en ligne.\n' +
     '• [g]L’App Évolution Conduites[/g] (celle-ci) : tout le reste — tes révisions, tes bilans, la messagerie avec l’équipe, les jeux.'],
    ['Comment réserver mes cours sur Drivup ?',
     'Va dans ton espace élève Drivup (bouton « 📅 Réserver mes cours sur Drivup » sur l’accueil de l’App), puis :\n' +
     '1. Achète les cours qu’il te faut (s’ils ne sont pas déjà dans ta formule).\n' +
     '2. Touche « Planifier » et choisis un créneau.\n\n' +
     'Leçons, écoutes pédagogiques, simulateur, théorie en salle, code en salle ou en visio : tout se réserve là. Tes cours apparaissent ensuite dans l’App.\n' +
     'Tu ne trouves pas de créneau (en boîte manuelle surtout) ? Écris-nous.'],
    ['Comment marche l’App Évolution Conduites ?',
     'Tes identifiants (ton prénom et ton nom + ton code personnel) t’ont été envoyés par mail.\n' +
     '• [g]Accueil[/g] : ton prochain cours, ta dernière leçon, les bureaux.\n' +
     '• [g]Réviser[/g] : les vidéos et guides (groupes de travail), et le bilan de chacune de tes leçons.\n' +
     '• [g]Vérifs[/g] : le jeu des vérifications intérieures et extérieures.\n' +
     '• [g]Réciter[/g] : tes procédures à réciter au micro, corrigées par l’équipe.\n' +
     '• [g]Écrire[/g] : la messagerie avec le bureau.\n\n' +
     'Tout ne s’affiche pas pour tout le monde : l’école ouvre ce qui correspond à ta formation. S’il te manque quelque chose, demande-le depuis Écrire.'],
    ['Comment mettre l’App sur mon téléphone et activer les notifications ?',
     'Sur l’accueil de l’App, un bandeau te le propose avec un bouton. Sinon :\n' +
     '• [g]Android (Chrome)[/g] : menu ⋮ › « Ajouter à l’écran d’accueil ».\n' +
     '• [g]iPhone (Safari)[/g] : bouton Partager › « Sur l’écran d’accueil ».\n\n' +
     'Active les notifications : tu sais tout de suite quand on te répond.'],
    ['J’ai perdu mon code de l’App',
     'Pas grave : écris-nous (ou appelle le bureau) et on te le renvoie.'],
    ['Kopilote : c’est quoi ?',
     'Kopilote, c’est l’application de code en ligne : tes cours et tes tests de code, quand tu veux, où tu veux.\n' +
     'Un souci de connexion ou un test qui ne se lance pas ? Écris-nous depuis l’onglet Écrire.'] ] },

  { titre: '⏰ Au quotidien', questions: [
    ['Les horaires du bureau',
     'Du [g]lundi au samedi, de 10 h à 18 h[/g].\n' +
     'Certains créneaux se réservent seulement en ligne, de 9 h à 10 h et de 18 h à 19 h (code, tablettes, simulateur en autonomie…).\n\n' +
     'Les horaires de la semaine de chaque bureau sont sur l’accueil de l’App (carte 🕒 Les bureaux).'],
    ['Je dois annuler ou décaler un cours',
     'Préviens-nous [g]au moins 48 heures avant[/g] : un cours non décommandé 48 h avant est dû.\n' +
     'Dans l’App : onglet Écrire › « Annuler ou décaler ».'],
    ['Je suis en retard',
     'Préviens-nous tout de suite : onglet Écrire › « En retard ».\n' +
     'Pour une urgence dans l’heure, appelle le bureau.\n\n' +
     'Une écoute pédagogique ne t’attend pas : en retard, tu la manques.'],
    ['C’est quoi une écoute pédagogique ?',
     'Tu es assis(e) à l’arrière pendant le cours de conduite d’un autre élève : tu regardes, tu écoutes les explications du moniteur, et tu apprends beaucoup.\n\n' +
     'Elles se réservent sur Drivup. Si tu es absent(e) sans prévenir, 5 € TTC sont facturés.'],
    ['J’ai oublié quelque chose dans la voiture',
     'Onglet Écrire › « Objet oublié » (ta carte SD, par exemple) : en un seul appui, on prévient le moniteur.'] ] }
];

function blocsDuThemeFaq(t){
  const blocs = [];
  t.questions.forEach((q, i) => {
    blocs.push({ type: 'titre', titre: q[0], texte: '', fichier: '', id: 't' + (i + 1) });
    blocs.push({ type: 'texte', titre: '', texte: q[1], fichier: '' });
  });
  return blocs;
}

/* L'écran vide : créer la FAQ avec les premiers textes */
function dessinerFaqVide(zone){
  zone.innerHTML = '';
  const c = document.createElement('div');
  c.className = 'faqVide';
  c.style.cssText = 'border:1px dashed var(--line);border-radius:14px;padding:16px;max-width:620px;';
  const n = FAQ_PREMIERS_THEMES.reduce((a, t) => a + t.questions.length, 0);
  c.innerHTML = '<div style="font-size:15px;font-weight:800;margin-bottom:8px;">❓ La FAQ n’existe pas encore</div>' +
    '<div style="font-size:13px;line-height:1.6;color:var(--muted);margin-bottom:10px;">Elle se crée avec ' + FAQ_PREMIERS_THEMES.length +
    ' thèmes et ' + n + ' questions déjà rédigés d’après le groupe Facebook — <b>en brouillon</b> : rien ne part chez les élèves tant que tu n’as pas relu et publié un thème. ' +
    'Tu ajoutes ensuite les vidéos et les images dans chaque question.</div>' +
    '<ul style="font-size:13px;line-height:1.6;margin:0 0 12px 18px;padding:0;">' +
    FAQ_PREMIERS_THEMES.map(t => '<li><b>' + echParcours(t.titre) + '</b> · ' + t.questions.length + ' questions</li>').join('') + '</ul>';
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'btn btn-primary faqCreer';
  b.style.cssText = 'width:auto;padding:11px 16px;font-size:13.5px;';
  b.textContent = '➕ Créer la FAQ avec ces premiers textes';
  b.addEventListener('click', async () => {
    b.disabled = true;
    b.textContent = '⏳ Création… (une dizaine de secondes)';
    try{
      const rep = await appelPrep({ action: 'faqCreer', nom: 'Questions fréquentes',
        themes: FAQ_PREMIERS_THEMES.map(t => ({ titre: t.titre, blocs: blocsDuThemeFaq(t) })) });
      if(!rep || rep.status !== 'ok') throw new Error((rep && rep.message) || 'refusé');
      if(rep.options) parcoursOptions = rep.options;
      if(rep.id) parcoursGroupeOuvert = rep.id;
      showToast('❓ FAQ créée : ' + (rep.themes || 0) + ' thèmes en brouillon ✅');
      afficherFaqEquipe();
    }catch(e){
      showToast('Impossible : ' + ((e && e.message) || e));
      b.disabled = false;
      b.textContent = '➕ Créer la FAQ avec ces premiers textes';
    }
  });
  c.appendChild(b);
  zone.appendChild(c);
}

window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-faq.js'] = true;
