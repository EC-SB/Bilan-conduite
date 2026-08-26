/* ============================================================
   ec-eval-aac.js
   Les évaluations en conduite accompagnée et supervisée.

   Le nombre d'heures ne se calcule pas : il est fixé — vingt en
   boîte manuelle, quinze en automatique. Seules les heures de
   l'évaluation varient, et elles ne servent qu'à dire à l'élève
   ce qu'il aurait fait en formation classique.

   La conduite supervisée suit le même programme : seul le nom
   change.

   Application Bilan de conduite — Évolution Conduites
   ============================================================ */

/* Le programme, identique pour l'AAC et la CS. Ce qui change
   d'une boîte à l'autre : le total, le simulateur, les leçons. */
const PROGRAMME_AAC = {
  bv:  { total: 20, simu: 3, lecons: 5 },
  bea: { total: 15, simu: 2, lecons: 3 }
};


/* La version Messenger, avec ses caractères stylisés */
function messageAacMessenger(heuresEval, auto, supervisee){
  const p = auto ? PROGRAMME_AAC.bea : PROGRAMME_AAC.bv;
  const nom = supervisee
    ? '𝘾𝙊𝙉𝘿𝙐𝙄𝙏𝙀 𝙎𝙐𝙋𝙀𝙍𝙑𝙄𝙎𝙀́𝙀'
    : '𝘾𝙊𝙉𝘿𝙐𝙄𝙏𝙀 𝘼𝘾𝘾𝙊𝙈𝙋𝘼𝙂𝙉𝙀́𝙀';

  return [
'𝙏𝙪 𝙖𝙨 𝙛𝙖𝙞𝙨 𝙩𝙤𝙣 𝙚́𝙫𝙖𝙡𝙪𝙖𝙩𝙞𝙤𝙣 𝙨𝙪𝙧 𝙨𝙞𝙢𝙪𝙡𝙖𝙩𝙚𝙪𝙧 !',
'Tu as été évalué(e) à ' + (heuresEval || '❓') + 'h, mais comme tu es en ' +
  nom + ', tu ne feras que ' + p.total +
  'h avant de partir avec ton ou tes accompagnateurs selon le programme suivant :',
'',
'1- 𝗖𝗢𝗨𝗥𝗦 𝗗𝗘 𝗧𝗛𝗘́𝗢𝗥𝗜𝗘 𝗗𝗘 𝗟𝗔 𝗖𝗢𝗡𝗗𝗨𝗜𝗧𝗘 : 3 heures',
'🕙 𝗔𝗖𝗖𝗘̀𝗦 𝗔̀ 𝗡𝗢𝗦 𝗥𝗘𝗦𝗦𝗢𝗨𝗥𝗖𝗘𝗦 𝗦𝗨𝗥 𝗙𝗔𝗖𝗘𝗕𝗢𝗢𝗞 : en illimité',
'🕙 𝗘́𝗖𝗢𝗨𝗧𝗘𝗦 𝗣𝗘́𝗗𝗔𝗚𝗢𝗚𝗜𝗤𝗨𝗘𝗦 𝗘𝗡 𝗩𝗢𝗜𝗧𝗨𝗥𝗘 : en illimité',
'2- 𝗦𝗜𝗠𝗨𝗟𝗔𝗧𝗘𝗨𝗥 𝗔𝗩𝗘𝗖 𝗠𝗢𝗡𝗜𝗧𝗘𝗨𝗥 : ' + p.simu + ' heures modulables selon ton niveau',
'3- 𝗟𝗘𝗖̧𝗢𝗡𝗦 𝗗𝗘 𝗖𝗢𝗡𝗗𝗨𝗜𝗧𝗘 𝗘𝗡 𝗩𝗢𝗜𝗧𝗨𝗥𝗘 : ' + p.lecons + ' leçons de 2 heures modulables selon ton niveau',
'4 - 𝗦𝗜𝗠𝗨𝗟𝗔𝗧𝗘𝗨𝗥 𝗡𝗨𝗜𝗧 : 1 heure 𝗘𝗧 𝗥𝗜𝗦𝗤𝗨𝗘 : 1 heure',
'5- 𝗟𝗘𝗖̧𝗢𝗡𝗦 𝗗𝗘 𝗖𝗢𝗡𝗗𝗨𝗜𝗧𝗘 𝗘𝗡 𝗩𝗢𝗜𝗧𝗨𝗥𝗘 : 1 leçon de 2 heures modulables selon ton niveau ',
'👨‍👩‍👦 Ensuite, tu as 3h :',
'6- 𝗙𝗢𝗥𝗠𝗔𝗧𝗜𝗢𝗡 𝗔𝗖𝗖𝗢𝗠𝗣𝗔𝗚𝗡𝗔𝗧𝗘𝗨𝗥 : 1 heure. Remise à niveau de ton accompagnateur',
'7- 𝗥𝗘𝗡𝗗𝗘𝗭-𝗩𝗢𝗨𝗦 𝗣𝗥𝗘́𝗔𝗟𝗔𝗕𝗟𝗘 : 1 leçon de 2h toi + ton ou tes accompagnateurs ',
'',
'',
'⚡𝙋𝙊𝙐𝙍 𝙋𝙊𝙐𝙑𝙊𝙄𝙍 𝘾𝙊𝙈𝙈𝙀𝙉𝘾𝙀𝙍 𝙏𝘼 𝙁𝙊𝙍𝙈𝘼𝙏𝙄𝙊𝙉 :',
'👀 Nous allons t\'envoyer le devis pour ton départ en "' +
  (supervisee ? 'conduite supervisée' : 'conduite accompagnée') + '".',
'📝 Tu vas recevoir un contrat numérique par mail à signer.',
'👉 Achète la "formule complète" correspondant aux 1, 🕙, 2, 4 du programme sur ton interface élève Drivup.',
'https://www.facebook.com/groups/174715876519873/permalink/640345686623554/ 👀',
'- tu peux régler directement en ligne sur ton interface (si tu es sur Iphone passe par Safari et non par l\'appli)',
' - par chèque ou espèce au bureau',
' - paiement en 3 ou 4 fois via un prestataire (avec des frais à ta charge)',
'👉 Dis-nous dès que tu as planifié tes 3h de théorie, pour que l\'on puisse planifier ensemble le simulateur avec moniteur.',
'👉 Ensuite, tu pourras acheter les leçons de conduites. ',
'⚠️ Bosse à fond les groupes Facebook, viens régulièrement en écoutes pédagogiques et visionne ta carte SD, méthodes testées et approuvées ⚠️',
'',
'',
'𝙑𝙊𝙄𝘾𝙄 𝘾𝙀 𝙌𝙐𝙀 𝙏𝙐 𝘼𝘾𝘾𝙀𝙋𝙏𝙀𝙎 𝙀𝙉 𝙎𝙄𝙂𝙉𝘼𝙉𝙏 𝙇𝙀 𝘾𝙊𝙉𝙏𝙍𝘼𝙏 :',
'"𝙇\'𝙚́𝙡𝙚̀𝙫𝙚 𝙖𝙘𝙘𝙚𝙥𝙩𝙚 𝙡𝙖 𝙢𝙖𝙣𝙞𝙚̀𝙧𝙚 𝙚𝙩 𝙡𝙚 𝙛𝙤𝙣𝙘𝙩𝙞𝙤𝙣𝙣𝙚𝙢𝙚𝙣𝙩 𝙙𝙚 𝙩𝙧𝙖𝙫𝙖𝙞𝙡𝙡𝙚𝙧 𝙙𝙪 𝙘𝙚𝙣𝙩𝙧𝙚 𝙙𝙚 𝙛𝙤𝙧𝙢𝙖𝙩𝙞𝙤𝙣. 𝙄𝙡 𝙡𝙪𝙞 𝙖 𝙗𝙞𝙚𝙣 𝙚́𝙩𝙚́ 𝙞𝙣𝙙𝙞𝙦𝙪𝙚́ 𝙦𝙪𝙚 𝙨𝙞 𝙘𝙚𝙡𝙖 𝙣𝙚 𝙡𝙪𝙞 𝙘𝙤𝙣𝙫𝙚𝙣𝙖𝙞𝙩 𝙥𝙖𝙨, 𝙞𝙡 𝙚𝙭𝙞𝙨𝙩𝙚 𝙙\'𝙖𝙪𝙩𝙧𝙚𝙨 𝙢𝙚́𝙩𝙝𝙤𝙙𝙤𝙡𝙤𝙜𝙞𝙚𝙨 𝙙𝙖𝙣𝙨 𝙙\'𝙖𝙪𝙩𝙧𝙚𝙨 𝙚́𝙩𝙖𝙗𝙡𝙞𝙨𝙨𝙚𝙢𝙚𝙣𝙩𝙨.',
'',
'📚 M\'engage à accepter la manière de travailler du centre de formation Évolution Conduites expliquée dans la vidéo de présentation que vous avez regardée à l\'accueil.',
'',
'🤝 Comprend que l\'accès aux écoutes pédagogiques et aux groupes de travail, sont un réel complément aux heures de conduites, qu\'ils seront ouverts et accessibles UNIQUEMENT pendant ma présence en formation, avec un réel investissement de ma part.',
'M\'engage à me donner à fond dans ma formation (travail à domicile, réservations des cours en autonomie, pas d\'absence(s) ni de retard etc...)',
'',
'🌟 Est bien conscient(e) d\'être dans un centre de formation de la conduite et de la sécurité routière et de ce fait, accepter avec notre aide, de devenir un(e) conducteur(trice) sûr(e) et responsable."',
'',
'📜 Dès le règlement effectué, tu recevras le déroulé complet de ta formation de futur pilote.'
  ].join('\n');
}


/* La version Driv'up : sans émoji ni caractère stylisé */
function messageAacMail(heuresEval, auto, supervisee){
  const p = auto ? PROGRAMME_AAC.bea : PROGRAMME_AAC.bv;
  const nom = supervisee ? 'conduite supervisée' : 'conduite accompagnée';

  return [
'Tu as fais ton évaluation sur simulateur',
'',
'Tu as été évalué(e) à ' + (heuresEval || '❓') + 'h, mais comme tu es en ' +
  nom + ', tu ne feras que ' + p.total + 'h avant de partir en ' + nom +
  ' avec ton ou tes accompagnateurs selon le programme suivant :',
'',
'1- COURS THÉORIE DE LA CONDUITE : 3 heures',
'* ACCÈS A NOS RESSOURCES FACEBOOK: en illimité',
' *ÉCOUTES PÉDAGOGIQUES EN VOITURE: en illimité',
'2- SIMULATEUR AVEC MONITEUR : ' + p.simu + ' heures modulables selon ton niveau',
'3- LEÇONS DE CONDUITE EN VOITURE : ' + p.lecons + ' leçons de 2 heures modulables selon ton niveau',
'4 - SIMULATEUR DE NUIT : 1 heure ET RISQUES : 1 heure',
'5- LEÇONS DE CONDUITE EN VOITURE : 1 leçon de 2 heures modulables selon ton niveau ',
'',
'Ensuite tu as 3h :',
'',
'6- FORMATION ACCOMPAGNATEUR : 1 heure. Remise à niveau de ton accompagnateur',
'7- RENDEZ VOUS PRÉALABLE: 1 leçon de 2h toi + 1 accompagnateur minimum',
'',
'',
' POUR POUVOIR COMMENCER TA FORMATION',
' Nous allons t\'envoyer le devis pour ton départ en "' + nom + '".',
' Tu vas recevoir un contrat numérique par mail à signer.',
' Achète la "formule complète" correspondant aux 1, *, 2, 4 du programme sur ton interface élève Drivup.',
'https://www.facebook.com/groups/174715876519873/permalink/640345686623554/ ',
'- tu peux régler directement en ligne sur ton interface (si tu es sur Iphone passe par Safari et non par l\'appli)',
' - par chèque ou espèce au bureau',
' - paiement en 3 ou 4 fois via un prestataire (avec des frais à ta charge)',
' Dis-nous dès que tu as planifié tes 3h de théorie, pour que l\'on puisse planifier ensemble le simulateur avec moniteur.',
' Ensuite, tu pourras acheter les leçons de conduites. ',
' Bosse à fond les groupes Facebook, viens régulièrement en écoutes pédagogiques et visionne ta carte SD, méthodes testées et approuvées ',
'',
'VOICI CE QUE TU ACCEPTES EN SIGNANT LE CONTRAT:',
'"L\'élève accepte la manière et le fonctionnement de travailler du centre de formation. Il lui a bien été indiqué que si cela ne lui convenait pas, il existe d\'autres méthodologies dans d\'autres établissements.',
'',
'M\'engage à accepter la manière de travailler du centre de formation Évolution Conduites expliquée dans la vidéo de présentation que vous avez regardée à l\'accueil.',
'',
'Comprend que l\'accès aux écoutes pédagogiques et aux groupes de travail, sont un réel complément aux heures de conduites, qu\'ils seront ouverts et accessibles UNIQUEMENT pendant ma présence en formation, avec un réel investissement de ma part.',
'M\'engage à me donner à fond dans ma formation (travail à domicile, réservations des cours en autonomie, pas d\'absence(s) ni de retard etc...)',
'',
'Est bien conscient(e) d\'être dans un centre de formation de la conduite et de la sécurité routière et de ce fait, accepter avec notre aide, de devenir un(e) conducteur(trice) sûr(e) et responsable."',
'',
'Dès le règlement effectué, tu recevras le déroulé complet de ta formation de futur pilote.'
  ].join('\n');
}


/* Signale que ce module est bien chargé */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-eval-aac.js'] = true;
