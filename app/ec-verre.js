/* Déployé le 07/11/2026 à 11:10 — v1376 */
/* ============================================================
   🫧 LE NOUVEAU GRAPHISME « VERRE » (Liquid Glass) — v1374

   David, le 7 novembre : une refonte graphique de l'appli équipe,
   validée sur balade (tous les onglets), avec :
     · un INTERRUPTEUR dans le menu ⋯ pour revenir au graphisme
       d'aujourd'hui (gardé sur l'appareil : chacun choisit) ;
     · la barre des onglets en icônes dessinées, famille « B » : des
       traits fins, UNE COULEUR PAR ONGLET ;
     · les autres icônes (sous-menus, onglets du dossier élève, titres
       de section, boutons secondaires, en-tête) en « V2 » : la même
       famille de traits, chacune dans LA COULEUR D'ORIGINE DE SON
       EMOJI (cloche jaune, voiture rouge, tâches vertes…).

   ⚠️ L'EMOJI RESTE DANS LE DOM, CACHÉ. On n'efface rien : devant
   « 🔍 Rechercher », on pose l'icône dessinée et l'emoji passe dans un
   <span class="emo"> masqué quand le verre est allumé. « textContent »
   rend donc toujours « 🔍 Rechercher » — tout ce qui lit les libellés
   (filtres, comparaisons, tests) continue de marcher, et l'interrupteur
   éteint ramène l'emoji sans redessiner quoi que ce soit.

   ⚠️ LES BOUTONS D'ACTION GARDENT LEUR EMOJI (🎙️ Démarrer, ✍️ Bilan à
   la main, 📅 Réserver…) : ce sont des repères de couleur pour les
   moniteurs. Seuls les boutons SECONDAIRES (.btn-secondary) sont
   habillés. Les emoji dans les textes et le bandeau ne bougent pas.

   La feuille de style vit dans index.html (bloc « 🫧 VERRE »), tout
   s'accroche à la classe « verre » posée sur <body>.
   ============================================================ */
(function(){
  'use strict';

  var CLE = 'ec_verre';
  function verreActif(){
    try{ return localStorage.getItem(CLE) !== 'non'; }catch(e){ return true; }
  }

  /* ---------- la bibliothèque : des glyphes 24 px, traits 1.8 ---------- */
  var S = 'viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
  var G = {
    calendrier:'<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3v4M16 3v4"/>',
    cloche:'<path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 2h-14z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
    telephone:'<path d="M5 4.5h3.2l1.6 4-2 1.3a11 11 0 0 0 6.4 6.4l1.3-2 4 1.6v3.2a1.5 1.5 0 0 1-1.6 1.5A15.5 15.5 0 0 1 3.5 6.1 1.5 1.5 0 0 1 5 4.5z"/>',
    personne:'<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
    personnes:'<circle cx="9" cy="8.5" r="3.3"/><path d="M3 19.5a6 6 0 0 1 12 0"/><circle cx="16.5" cy="9.5" r="2.6"/><path d="M15.5 14.2a5 5 0 0 1 5.5 5.3"/>',
    feuille:'<rect x="5" y="3.5" width="14" height="17" rx="2.5"/><path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4.5"/>',
    presse:'<rect x="5" y="4.5" width="14" height="16.5" rx="2.5"/><path d="M9 3.5h6v2.2H9z"/><path d="M8.5 10.5h7M8.5 13.8h7M8.5 17h4.5"/>',
    livres:'<rect x="4" y="4" width="4.5" height="16" rx="1"/><rect x="9.5" y="4" width="4.5" height="16" rx="1"/><path d="m15.5 5.2 3.9-1 3 15.5-3.9 1z"/>',
    enveloppe:'<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="m4 7 8 6 8-6"/>',
    bulle:'<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.2 3.3V16A2.5 2.5 0 0 1 4 13.5z"/><path d="M8.5 9h7M8.5 12.2h4.5"/>',
    mobile:'<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
    coche:'<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="m8 12.3 2.8 2.7L16.5 9"/>',
    check:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    plus:'<circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/>',
    porte:'<rect x="5" y="3.5" width="12" height="17" rx="1.5"/><path d="M17 12h3.5M18.5 9.5 21 12l-2.5 2.5"/><circle cx="9" cy="12.2" r=".9" fill="currentColor" stroke="none"/>',
    carte_id:'<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><circle cx="8.5" cy="11" r="2"/><path d="M5.5 16a3 3 0 0 1 6 0M13.5 10h4.5M13.5 13h4.5"/>',
    stats:'<path d="M4 20V5M4 20h16"/><path d="M8 16v-5M12 16V8M16 16v-3"/>',
    graphe:'<path d="M4 20V5M4 20h16"/><path d="m6.5 15 4-4.5 3 2.5 5-5.5"/>',
    billets:'<rect x="3" y="7" width="18" height="11" rx="2"/><circle cx="12" cy="12.5" r="2.5"/><path d="M6 10.5h.01M18 14.5h.01"/>',
    carte_bancaire:'<rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M3 10h18M6.5 14.5h4"/>',
    fauteuil:'<circle cx="11" cy="4.5" r="1.6"/><path d="M11 7v5h5l2.5 5.5"/><path d="M9 11.5a5 5 0 1 0 6.5 6"/>',
    chapeau:'<path d="m2.5 9 9.5-4 9.5 4-9.5 4z"/><path d="M6.5 11v4.5c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3V11M21.5 9v5"/>',
    lune:'<path d="M19.5 14.5A8 8 0 1 1 9.5 4.5a6.5 6.5 0 0 0 10 10z"/>',
    poignee:'<path d="M2.5 11 7 6.5h4l3 3-2.5 2.5-2.5-2.5"/><path d="M21.5 11 17 6.5h-3"/><path d="M11.5 12 15 15.5l-1.5 1.5-3-3M13.5 17 15 18.5l-1.5 1.5-3-3M10 19l-1.5 1.5L7 19"/>',
    oreille:'<path d="M6.5 10a5.5 5.5 0 1 1 9.8 3.4c-1.3 1.6-2.3 2.4-2.3 4.6a2.5 2.5 0 0 1-5 0"/><path d="M9.5 10a2.5 2.5 0 0 1 5 0c0 1.2-.8 1.6-1.4 2.3"/>',
    clap:'<rect x="3" y="9" width="18" height="11" rx="2.5"/><path d="M3 9 5 4.5h14L21 9M8 4.5 6.5 9M13 4.5 11.5 9M18 4.5 16.5 9"/>',
    megaphone:'<path d="M4 10v4h3l7 4V6l-7 4z"/><path d="M17.5 9.5a3.5 3.5 0 0 1 0 5"/><path d="M7 14v4.5h2.5"/>',
    tele:'<rect x="3" y="5" width="18" height="12.5" rx="2.5"/><path d="M8.5 21h7M12 17.5V21"/>',
    boite_arrivee:'<path d="M4 13.5V17a2.5 2.5 0 0 0 2.5 2.5h11A2.5 2.5 0 0 0 20 17v-3.5"/><path d="M4 13.5h4l1.5 2.5h5l1.5-2.5h4M12 4v8M9 9.5l3 3 3-3"/>',
    boite_depart:'<path d="M4 13.5V17a2.5 2.5 0 0 0 2.5 2.5h11A2.5 2.5 0 0 0 20 17v-3.5"/><path d="M4 13.5h4l1.5 2.5h5l1.5-2.5h4M12 12V4M9 6.5l3-3 3 3"/>',
    ecole:'<path d="M4 20V9l8-5 8 5v11"/><path d="M4 20h16M10 20v-4.5h4V20M9 12h2M13 12h2"/>',
    banque:'<path d="m3 9 9-5 9 5z"/><path d="M5 9v8M9.5 9v8M14.5 9v8M19 9v8M3 20h18"/>',
    euro:'<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.6A4.3 4.3 0 0 0 8.2 12a4.3 4.3 0 0 0 7.3 3.4M6.5 10.8h6.5M6.5 13.2h6.5"/>',
    etiquette:'<path d="M3.5 12.5V5.5a2 2 0 0 1 2-2h7l8 8-7 7z"/><circle cx="8" cy="8" r="1.3"/>',
    camion:'<path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
    mallette:'<rect x="3" y="8" width="18" height="12" rx="2.5"/><path d="M9 8V6.5A1.5 1.5 0 0 1 10.5 5h3A1.5 1.5 0 0 1 15 6.5V8"/><path d="M3 13h18"/><path d="M10.5 13v2M13.5 13v2"/>',
    document:'<path d="M6 3.5h8l4.5 4.5v12.5H6z"/><path d="M14 3.5V8h4.5M9 12h6M9 15.5h6"/>',
    feu:'<rect x="8" y="2.5" width="8" height="19" rx="3"/><circle cx="12" cy="6.5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="17.5" r="1.5" fill="currentColor"/>',
    squelette:'<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M3 14h18M7 6v12M17 6v12"/>',
    repere:'<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    voiture:'<path d="M4 13.5 5.8 8.6A2 2 0 0 1 7.7 7.2h8.6a2 2 0 0 1 1.9 1.4L20 13.5"/><rect x="3" y="13" width="18" height="5.5" rx="1.8"/><path d="M6 18.5V20M18 18.5V20"/><circle cx="7.5" cy="15.8" r=".9" fill="currentColor" stroke="none"/><circle cx="16.5" cy="15.8" r=".9" fill="currentColor" stroke="none"/>',
    gyrophare:'<path d="M12 3v2M5.5 6.5 7 8M18.5 6.5 17 8M3.5 12h2M18.5 12h2"/><path d="M7 19.5v-4a5 5 0 0 1 10 0v4z"/><path d="M5 19.5h14"/>',
    carte_plan:'<path d="m3.5 6 5.5-2 6 2 5.5-2v14l-5.5 2-6-2-5.5 2z"/><path d="M9 4v14M15 6v14"/>',
    progression:'<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none" opacity=".35"/><path d="M12 7v5l3 2"/>',
    balai:'<path d="m15 3 6 6-7.5 7.5-6-6z"/><path d="M8.5 11.5 4 16a2.5 2.5 0 0 0 3.5 3.5l4.5-4.5"/><path d="m10.5 9.5 4 4"/>',
    cadenas:'<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/><circle cx="12" cy="15.5" r="1.2" fill="currentColor" stroke="none"/>',
    cadenas_ouvert:'<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8a4 4 0 0 1 7.6-1.7"/><circle cx="12" cy="15.5" r="1.2" fill="currentColor" stroke="none"/>',
    curseurs:'<path d="M4 7h16M4 12h16M4 17h16"/><circle cx="9" cy="7" r="2.3" fill="var(--fond,#F2F2EC)"/><circle cx="15.5" cy="12" r="2.3" fill="var(--fond,#F2F2EC)"/><circle cx="8" cy="17" r="2.3" fill="var(--fond,#F2F2EC)"/>',
    gant:'<path d="M7 20.5V10a1.5 1.5 0 0 1 3 0v3V5.5a1.5 1.5 0 0 1 3 0V13V6.5a1.5 1.5 0 0 1 3 0V13v-3a1.5 1.5 0 0 1 3 0v6a4.5 4.5 0 0 1-4.5 4.5z"/>',
    drapeau:'<path d="M5 21V4"/><path d="M5 4h13l-3 4.5 3 4.5H5"/>',
    interdit:'<circle cx="12" cy="12" r="8.5"/><path d="M6 6l12 12"/>',
    question:'<circle cx="12" cy="12" r="8.5"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.7"/><circle cx="12" cy="16.8" r=".9" fill="currentColor" stroke="none"/>',
    moto:'<circle cx="6" cy="16.5" r="3"/><circle cx="18" cy="16.5" r="3"/><path d="M6 16.5 9 10h4l2.5 3.5H18M13 10l-2-3h3"/>',
    loupe:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.6-4.6"/>',
    micro:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0"/><path d="M12 17.5V21M9 21h6"/>',
    journal:'<rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M8 9h8M8 12.5h8M8 16h5"/>',
    carnet:'<rect x="5" y="3.5" width="14" height="17" rx="2.5"/><path d="M8.5 8h7M8.5 11.5h7M8.5 15h4.5"/><path d="M3.5 7h3M3.5 12h3M3.5 17h3"/>',
    puce:'<rect x="7" y="7" width="10" height="10" rx="2"/><path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4"/>',
    cle:'<path d="M14.5 6.5a4 4 0 0 0 4.9 4.9l-7.6 7.6a1.8 1.8 0 0 1-2.6-2.6l7.6-7.6a4 4 0 0 0-2.3-2.3z"/><path d="m5 5 3.5 3.5"/>',
    cle_acces:'<circle cx="8" cy="14" r="4.5"/><path d="m11.5 10.5 8-8M16 6l2.5 2.5M13.5 8.5 16 11"/>',
    alerte:'<path d="M12 4 2.8 19.5h18.4z"/><path d="M12 10v4M12 16.8h.01"/>',
    boussole:'<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
    fiche:'<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 13.5h5M7 16h3"/>',
    crayon:'<path d="m14.5 5.5 4 4L8 20H4v-4z"/><path d="m12.5 7.5 4 4"/>',
    note:'<path d="M5 3.5h10l4 4V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z"/><path d="M8.5 11h7M8.5 14.5h7M8.5 18h4"/>',
    corbeille:'<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/><path d="M10 11v6M14 11v6"/>',
    retour:'<path d="M9 7 4 12l5 5"/><path d="M4 12h10a6 6 0 0 1 0 12"/>',
    fleche:'<path d="M4 12h16M14 6l6 6-6 6"/>',
    rafraichir:'<path d="M20 12a8 8 0 0 1-14 5.3M4 12a8 8 0 0 1 14-5.3"/><path d="M4 7v5h5M20 17v-5h-5"/>',
    croix:'<path d="m6.5 6.5 11 11M17.5 6.5l-11 11"/>',
    horloge:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
    sablier:'<path d="M6.5 3.5h11M6.5 20.5h11M8 3.5v3.5a4 4 0 0 0 8 0V3.5M8 20.5V17a4 4 0 0 1 8 0v3.5"/>',
    reveil:'<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 1.5M5 5 3 7M19 5l2 2"/>',
    oeil:'<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="3"/>',
    photo:'<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M8.5 7 10 4.5h4L15.5 7"/><circle cx="12" cy="13.5" r="3.2"/>',
    image:'<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="m4 17 5-5 4 4 2.5-2.5 5 5"/><circle cx="16" cy="9" r="1.5"/>',
    epingle:'<path d="M15 3.5 20.5 9l-3 1 .5 4.5L13.5 19l-3.5-3.5L5 20.5l5-5L6.5 12 11 7.5l4.5.5z"/>',
    lien:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    trombone:'<path d="m16.5 6.5-8 8a2.5 2.5 0 0 0 3.5 3.5l8.5-8.5a4.5 4.5 0 0 0-6.4-6.4L5.5 11.7a6.5 6.5 0 0 0 9.2 9.2L19 16.5"/>',
    maison:'<path d="M3.5 11.2 12 4l8.5 7.2"/><path d="M5.5 10v9a1 1 0 0 0 1 1h3.7v-5.2h3.6V20h3.7a1 1 0 0 0 1-1v-9"/>',
    batiment:'<rect x="4" y="3.5" width="16" height="17" rx="1.5"/><path d="M8 7.5h2M14 7.5h2M8 11.5h2M14 11.5h2M8 15.5h2M14 15.5h2M10.5 20.5v-3h3v3"/>',
    recu:'<path d="M6 3.5h12v17l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5z"/><path d="M9 8.5h6M9 12h6M9 15.5h4"/>',
    robot:'<rect x="5" y="8" width="14" height="11" rx="2.5"/><path d="M12 8V4.5M9.5 4.5h5"/><circle cx="9.5" cy="13" r="1.2" fill="currentColor" stroke="none"/><circle cx="14.5" cy="13" r="1.2" fill="currentColor" stroke="none"/><path d="M9.5 16.5h5"/>',
    eclair:'<path d="M13 2.5 5 13.5h6l-1 8 8-11h-6z"/>',
    main:'<path d="M8 11.5V5.5a1.5 1.5 0 0 1 3 0V11V4a1.5 1.5 0 0 1 3 0v7V5.5a1.5 1.5 0 0 1 3 0V12v-2a1.5 1.5 0 0 1 3 0v5a6 6 0 0 1-6 6h-2a6 6 0 0 1-5-2.7L4.5 14a1.6 1.6 0 0 1 2.6-1.9z"/>',
    etoile:'<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1.1 5.9L12 16.9l-5.3 2.8 1.1-5.9-4.3-4.1 5.9-.8z"/>',
    cible:'<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>',
    parole:'<path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h7A2.5 2.5 0 0 1 16 6.5v5a2.5 2.5 0 0 1-2.5 2.5H9l-4 3v-3A2.5 2.5 0 0 1 4 11.5z"/><path d="M19 8.5a4 4 0 0 1 0 6"/>',
    dossier:'<path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
    imprimante:'<path d="M7 8V3.5h10V8"/><rect x="3.5" y="8" width="17" height="9" rx="2"/><path d="M7 13h10v7.5H7z"/>',
    cadre_image:'<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="m4 17 5-5 4 4 2.5-2.5 5 5"/>',
    rotation:'<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v4.5h-4.5"/>',
    chrono:'<circle cx="12" cy="13.5" r="7"/><path d="M12 10v3.5l2 1.5M9.5 3.5h5M12 3.5v3"/>',
    loupe2:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m20 20-4.6-4.6M8 10.5h5M10.5 8v5"/>',
    bon:'<circle cx="12" cy="12" r="8.5"/><path d="m8 12.3 2.8 2.7L16.5 9"/>',
    stop:'<circle cx="12" cy="12" r="8.5"/><path d="M8 12h8"/>',
    train:'<rect x="5" y="3.5" width="14" height="13" rx="3"/><path d="M5 10h14M9 20.5l-1.5-3M15 20.5l1.5-3"/><circle cx="9" cy="13.5" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="13.5" r="1" fill="currentColor" stroke="none"/>'
  };
  function svg(g){ return '<svg ' + S + '>' + G[g] + '</svg>'; }

  /* ---------- emoji → glyphe ---------- */
  var EMO2G = {
    '📅':'calendrier','📆':'calendrier','🗓️':'calendrier','🔔':'cloche','📞':'telephone','👤':'personne','👥':'personnes',
    '📋':'presse','📚':'livres','✉️':'enveloppe','📨':'enveloppe','📧':'enveloppe','💬':'bulle','📱':'mobile','✅':'coche','☑️':'coche','✓':'check',
    '➕':'plus','🚪':'porte','🪪':'carte_id','📊':'stats','📈':'graphe','💶':'billets','💰':'etiquette','💳':'carte_bancaire','♿':'fauteuil',
    '🎓':'chapeau','🌙':'lune','🤝':'poignee','👂':'oreille','🎬':'clap','📣':'megaphone','📢':'megaphone','📺':'tele','📥':'boite_arrivee','📤':'boite_depart',
    '🏫':'ecole','🏦':'banque','💸':'euro','🚚':'camion','💼':'mallette','🧰':'mallette','📄':'document','🚦':'feu','🧠':'puce','📍':'repere',
    '🚗':'voiture','🚨':'gyrophare','🗺️':'carte_plan','🩹':'progression','🧹':'balai','🔐':'cadenas','🔒':'cadenas','🔓':'cadenas_ouvert','⚙️':'curseurs',
    '🧤':'gant','🏁':'drapeau','⛔':'interdit','🚫':'interdit','❓':'question','🤔':'question','🏍️':'moto','🔍':'loupe','🔎':'loupe','🎙️':'micro',
    '📓':'carnet','📝':'note','⚠️':'alerte','🧭':'boussole','📇':'fiche','🔑':'cle_acces','🔧':'cle','✏️':'crayon','🗑️':'corbeille','↩️':'retour','➡️':'fleche',
    '🔄':'rafraichir','🔁':'rotation','❌':'croix','✕':'croix','⏳':'sablier','⏱️':'chrono','⏰':'reveil','🕒':'horloge','👁️':'oeil','📷':'photo','🖼️':'image',
    '📌':'epingle','🔗':'lien','📎':'trombone','🏠':'maison','🏢':'batiment','🧾':'recu','🤖':'robot','⚡':'eclair','✋':'main','⭐':'etoile','🎯':'cible',
    '🗣️':'parole','🗂️':'dossier','🖨️':'imprimante','💾':'document','🏷️':'etiquette','🚂':'train','🚌':'camion'
  };

  /* ---------- V2 : la couleur d'origine de chaque emoji (lisible sur fond clair) ---------- */
  var EMO_COL = {
    '👤':'#4B5563','📋':'#B45309','📚':'#B91C1C','🔔':'#D97706','📞':'#3F3F46','🗓️':'#DC2626','📅':'#DC2626','📆':'#DC2626','📺':'#0E7490','📥':'#2563EB','📤':'#2563EB','📊':'#2563EB','📈':'#16A34A',
    '💶':'#0369A1','💳':'#CA8A04','💰':'#CA8A04','♿':'#1D4ED8','🎓':'#3F3F46','➕':'#374151','🪪':'#2563EB','🚪':'#92400E',
    '🌙':'#CA8A04','🤝':'#D97706','👂':'#D97706','🎬':'#3F3F46','👥':'#4B5563','📣':'#DC2626','📢':'#DC2626',
    '⛔':'#DC2626','🚫':'#DC2626','🤔':'#CA8A04','❓':'#DC2626','🏁':'#3F3F46','🏍️':'#DC2626','🚚':'#DC2626',
    '💬':'#4B5563','🧤':'#2563EB','✉️':'#2563EB','📨':'#2563EB','📧':'#2563EB','📱':'#3F3F46','✅':'#16A34A','☑️':'#16A34A','✓':'#16A34A','🏫':'#B45309','🏦':'#4B5563','💸':'#16A34A','💼':'#92400E','📄':'#4B5563','🚦':'#374151','🧠':'#DB2777','🧰':'#DC2626','📍':'#DC2626',
    '🚗':'#DC2626','🚨':'#DC2626','🗺️':'#16A34A','🩹':'#B45309','🧹':'#92400E','🔐':'#CA8A04','🔒':'#CA8A04','🔓':'#CA8A04','⚙️':'#4B5563','🎙️':'#3F3F46','🔍':'#4B5563','🔎':'#4B5563','📓':'#374151',
    '📝':'#B45309','⚠️':'#D97706','🧭':'#DC2626','📇':'#B45309','🔑':'#CA8A04','🔧':'#4B5563','✏️':'#CA8A04','🗑️':'#4B5563','↩️':'#2563EB','➡️':'#2563EB','🔄':'#2563EB','🔁':'#2563EB','❌':'#DC2626','✕':'#4B5563',
    '⏳':'#B45309','⏱️':'#3F3F46','⏰':'#DC2626','🕒':'#4B5563','👁️':'#4B5563','📷':'#3F3F46','🖼️':'#0E7490','📌':'#DC2626','🔗':'#2563EB','📎':'#4B5563','🏠':'#B45309','🏢':'#4B5563','🧾':'#4B5563','🤖':'#4B5563','⚡':'#CA8A04','✋':'#D97706','⭐':'#CA8A04','🎯':'#DC2626','🗣️':'#4B5563','🗂️':'#B45309','🖨️':'#4B5563','💾':'#2563EB','🏷️':'#CA8A04'
  };

  /* ---------- la barre des onglets : famille B, UNE couleur par onglet ---------- */
  var BARRE = {
    cours:      { g:'micro',    c:'#3B6900' },
    eleves:     { g:'loupe',    c:'#1350A8' },
    suivi:      { g:'carnet',   c:'#6D28D9' },
    permis:     { g:'voiture',  c:'#C96A00' },
    messagerie: { g:'bulle',    c:'#0E7C86' },
    outils:     { g:'mallette', c:'#8A5A00' },
    gestion:    { g:'curseurs', c:'#3F3F46' }
  };

  /* ---------- l'habillage ---------- */
  /* Un emoji de tête, suivi d'un espace (ou en fin de libellé), c'est le
     signe d'une icône. On ne touche pas aux emoji au milieu d'un texte. */
  var RE_TETE = /^\s*([\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2934}\u{2935}\u{203C}\u{2049}\u{2139}\u{2194}-\u{21AA}\u{231A}-\u{23FA}\u{25AA}-\u{25FE}\u{2705}\u{2713}\u{2715}\u{2716}\u{271A}\u{2728}\u{274C}\u{2753}-\u{2757}\u{2795}-\u{2797}\u{27A1}\u{27B0}\u{27BF}]\u{FE0F}?)(?:\u{200D}[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]\u{FE0F}?)*\s+(?=\S)/u;

  /* Ce qu'on habille : les titres, les sous-menus, les onglets du dossier,
     les boutons SECONDAIRES, les pastilles de la messagerie, les filtres. */
  var SELECTEURS = 'h2, h3, .section-title, summary, .barre-vues button[data-nom], button[data-onglet-eleve], ' +
                   '.btn.btn-secondary, .ckpOnglet, .sousonglets button, .prepQuiBoutons button, .grpTete button';

  function sansVariante(e){ return e.replace(/️/g, ''); }
  function glypheDe(emoji){ return EMO2G[emoji] || EMO2G[sansVariante(emoji)] || EMO2G[emoji + '️'] || ''; }
  function couleurDe(emoji){ return EMO_COL[emoji] || EMO_COL[sansVariante(emoji)] || EMO_COL[emoji + '️'] || '#4B5563'; }

  function habillerElement(el){
    /* Déjà fait, et toujours en place : on ne repasse pas. Déjà fait mais
       vidé (un textContent réécrit) : on refait. */
    if(el.getAttribute('data-verre') === '1' && el.querySelector(':scope > .vgl')) return;
    if(el.closest && el.closest('#barreOnglets')) return;
    var n = el.firstChild;
    while(n && n.nodeType === 3 && !n.textContent.trim()) n = n.nextSibling;
    if(!n || n.nodeType !== 3) return;
    var m = n.textContent.match(RE_TETE);
    if(!m) return;
    var g = glypheDe(m[1]);
    if(!g || !G[g]) return;
    var emo = document.createElement('span');
    emo.className = 'emo';
    emo.textContent = m[0];
    var ic = document.createElement('span');
    ic.className = 'vgl';
    ic.style.setProperty('--c', couleurDe(m[1]));
    ic.innerHTML = svg(g);
    n.textContent = n.textContent.slice(m[0].length);
    el.insertBefore(ic, n);
    el.insertBefore(emo, ic);
    el.setAttribute('data-verre', '1');
  }

  function habiller(racine){
    var r = racine && racine.querySelectorAll ? racine : document.body;
    if(!r) return;
    if(r.matches && r.matches(SELECTEURS)) habillerElement(r);
    var l = r.querySelectorAll(SELECTEURS);
    for(var i = 0; i < l.length; i++) habillerElement(l[i]);
  }

  function habillerLaBarre(){
    var nav = document.getElementById('barreOnglets');
    if(!nav) return;
    var bs = nav.querySelectorAll('.onglet');
    for(var i = 0; i < bs.length; i++){
      var b = bs[i], cible = b.getAttribute('data-cible');
      if(!BARRE[cible] || b.querySelector('.vgl')) continue;
      var sp = b.querySelector('span');
      if(!sp) continue;
      sp.classList.add('emo');
      var ic = document.createElement('span');
      ic.className = 'vgl';
      ic.style.setProperty('--c', BARRE[cible].c);
      ic.innerHTML = svg(BARRE[cible].g);
      b.insertBefore(ic, sp.nextSibling);
    }
  }

  /* L'en-tête : ☑️ tâches, 💬 messagerie, 🔓 déconnexion — leur emoji est le
     premier nœud texte, suivi d'une pastille : même recette. */
  function habillerLEntete(){
    ['todoBtn', 'msgElvBtn', 'logoutBtn', 'procRaccourci', 'cbBtn', 'loupeBtn'].forEach(function(id){
      var b = document.getElementById(id);
      if(!b || b.querySelector(':scope > .vgl')) return;
      var n = b.firstChild;
      while(n && n.nodeType === 3 && !n.textContent.trim()) n = n.nextSibling;
      if(!n || n.nodeType !== 3) return;
      var t = n.textContent.trim();
      var g = glypheDe(t);
      if(!g) return;
      var emo = document.createElement('span'); emo.className = 'emo'; emo.textContent = n.textContent;
      var ic = document.createElement('span'); ic.className = 'vgl'; ic.style.setProperty('--c', couleurDe(t)); ic.innerHTML = svg(g);
      b.replaceChild(ic, n);
      b.insertBefore(emo, ic);
    });
  }

  /* ---------- l'interrupteur ---------- */
  function majBoutonVerre(){
    var i = document.getElementById('verreInter');
    if(i) i.classList.toggle('off', !verreActif());
  }
  function poserVerre(on){
    document.body.classList.toggle('verre', !!on);
    majBoutonVerre();
  }
  function basculerVerre(){
    var on = !verreActif();
    try{ localStorage.setItem(CLE, on ? 'oui' : 'non'); }catch(e){}
    poserVerre(on);
    /* La barre change de forme (capsule décollée ou barre à plat) : la
       goutte verte se remesure comme après un pivotement. */
    setTimeout(function(){ try{ window.dispatchEvent(new Event('resize')); }catch(e){} }, 80);
    if(typeof showToast === 'function') showToast(on ? '🫧 Nouveau graphisme' : '↩️ Graphisme classique');
  }

  /* ---------- le suivi du DOM : ce qui se redessine se réhabille ---------- */
  var enAttente = null;
  function observer(){
    if(!window.MutationObserver) return;
    var o = new MutationObserver(function(muts){
      if(!enAttente) enAttente = [];
      for(var i = 0; i < muts.length; i++){
        var t = muts[i].target;
        if(t && t.nodeType === 1 && enAttente.indexOf(t) === -1) enAttente.push(t);
      }
      if(enAttente.programme) return;
      enAttente.programme = true;
      requestAnimationFrame(function(){
        var l = enAttente; enAttente = null;
        for(var k = 0; k < l.length; k++){ try{ habiller(l[k]); }catch(e){} }
        habillerLaBarre();
      });
    });
    o.observe(document.body, { childList: true, subtree: true });
  }

  function demarrer(){
    poserVerre(verreActif());
    habillerLaBarre();
    habillerLEntete();
    habiller(document.body);
    observer();
    var b = document.getElementById('verreBtn');
    if(b) b.addEventListener('click', function(){
      basculerVerre();
      var m = document.getElementById('plusMenu');
      if(m) m.style.display = 'none';
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', demarrer);
  else demarrer();

  window.verreActif = verreActif;
  window.basculerVerre = basculerVerre;
})();

/* Le garde-fou de ec-noyau.js (verifierModules) compte les <script> de la
   page et attend que chacun se déclare ici — sans ces deux lignes, le
   bandeau rouge « Application incomplète » le réclame (David, 07/11). */
window.EC_MODULES = window.EC_MODULES || {};
window.EC_MODULES['ec-verre.js'] = true;
