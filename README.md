# ShootByTheo — site portfolio

Site statique (Astro) pensé pour un photographe / vidéaste sportif : les images d'abord,
des pages ultra légères, et **aucun HTML à toucher pour ajouter un événement**.

```bash
npm install        # une seule fois
npm run dev        # aperçu sur http://localhost:4321 (les photos déposées sont traitées automatiquement)
npm run build      # génère le site à publier dans dist/
npm run preview    # vérifie le résultat du build
```

---

## Interface d'administration (CMS)

Tout (reportages, photos, catégories, page Prestations, réglages) se gère depuis
**[Sveltia CMS](https://sveltiacms.app)**, à l'adresse `/admin/`. Le panneau lit et écrit directement les
mêmes fichiers que les commandes `npm run …` : les deux approches restent utilisables à tout moment.

### Publier un reportage en 1 minute

1. **Reportages → Nouveau.**
2. Titre (« Top 12 • Journée 2 »), date, **catégorie** dans la liste — absente ? bouton **« Ajouter Catégorie »**,
   sans quitter la fiche —, puis les **rencontres** (une ligne chacune, ex. « BC Chambly — Béthune »).
3. **Glissez toutes les photos d'un coup** dans « Photos ». Chacune est réduite à 2560 px et convertie en WebP
   directement dans le navigateur (un JPEG de 10-20 Mo devient ~0,5-1 Mo) : l'envoi est rapide, le dépôt reste léger.
   Les photos HEIC de l'iPhone sont converties aussi.
4. **Couverture** : la première photo. Pour en changer, faites glisser la vignette voulue en tête de liste
   (ou choisissez-en une dans « Couverture »).
5. Cochez **« Autoriser le téléchargement »** si les joueurs peuvent récupérer les photos (bouton sur chaque photo
   de la visionneuse ; ajoutez un lien Drive/WeTransfer pour l'album complet).
6. **Enregistrer** : le site se reconstruit et se publie seul (≈ 3-5 min).

Dans la liste des reportages : tri par date (plus récents en premier), vignettes, groupement par catégorie,
filtres « Brouillons » / « Téléchargement autorisé », et **« Modifier en masse »** pour corriger titres, dates,
catégories, lieux ou téléchargement de plusieurs reportages dans un seul tableau.

### Utilisation locale (déjà prête, sans rien configurer)

1. `npm run dev`
2. Ouvrir **http://localhost:4321/admin/index.html** dans **Chrome ou Edge** (nécessaire : Firefox
   et Safari ne sont pas compatibles avec cette interface).
3. Cliquer **« Travailler avec un dépôt local »**, puis sélectionner le dossier du projet
   (`new sbt`) quand le navigateur le demande.
4. C'est tout : créer/modifier un événement, glisser des photos, changer un texte du site… chaque
   sauvegarde écrit directement les fichiers, exactement comme si vous les modifiiez à la main.

Le formulaire d'un événement ne montre que les champs les plus utiles (titre, date, compétition,
lieu, description, photos) — l'adresse de la page (`slug`, voir plus bas) est calculée toute seule,
et les champs plus rares (SEO, brouillon…) sont regroupés en bas.

Après avoir ajouté des photos par ce biais, lancez `npm run photos` (ou laissez `npm run dev`
tourner : il s'en charge tout seul) pour générer leurs versions optimisées AVIF/WebP.

### Utilisation à distance, depuis n'importe quel navigateur — ✅ déjà en place

Le dépôt GitHub (`theomeurr/new_shootbytheo`) et l'authentification (relais Cloudflare Workers
`sbt-cms-admin`) sont configurés. Une fois le site publié (voir « Publier le site » plus bas),
`/admin/index.html` fonctionne depuis n'importe quel navigateur (Mac, téléphone…) : bouton
**« Se connecter avec GitHub »**, sans rien installer.

`/admin/` n'est pas listé dans le sitemap ni indexé (voir `robots.txt`) ; seules les personnes
ayant accès au dépôt GitHub peuvent s'y connecter.

<details>
<summary>Reproduire cette configuration sur un autre projet</summary>

1. **Créer le dépôt** : sur [github.com/new](https://github.com/new), créez un dépôt (privé de
   préférence), puis :
   ```bash
   git add -A
   git commit -m "Site initial"
   git remote add origin https://github.com/VOTRE-COMPTE/VOTRE-DEPOT.git
   git push -u origin main
   ```
2. **Ouvrir `public/admin/config.yml`** et remplacer la ligne `repo:` par l'adresse de ce dépôt.
3. **Déployer l'authentification GitHub** (gratuit, une seule fois) : suivez le guide de
   [sveltia-cms-auth](https://github.com/sveltia/sveltia-cms-auth) — un petit script à déployer sur
   Cloudflare Workers (compte Cloudflare gratuit), plus une application OAuth à créer sur GitHub
   (quelques clics, aucune ligne de code). Dans Cloudflare, ajoutez `GITHUB_CLIENT_ID` et
   `GITHUB_CLIENT_SECRET` en **variables chiffrées** (« Encrypt »), jamais en clair.
4. Ajoutez l'adresse obtenue (`base_url`) sous `backend:` dans `config.yml`, commitez/poussez.
5. Publiez le site.

</details>

---

## Ajouter un événement (2 minutes)

### 1. Créer le dossier

```bash
npm run new-event
```

Le script pose quelques questions (titre, date, sport, compétition, lieu) et crée
`content/evenements/<slug>/event.json`. Vous pouvez aussi copier un dossier existant à la main.

### 2. Déposer les photos dans ce dossier

```
content/evenements/pre-nationale-j2-beauvais/
├─ event.json
├─ cover.jpg        ← couverture (facultatif, voir ci-dessous)
├─ 001.jpg
├─ 002.jpg
└─ …
```

- **Export conseillé** : JPEG, 2560 px de large, qualité 85 (sRGB). Inutile de déposer les originaux pleine définition.
- **Ordre** : celui des noms de fichiers (`001.jpg`, `002.jpg`…).
- **Couverture** : le fichier indiqué par `"cover"` dans `event.json`, sinon la première photo de `"gallery"`,
  sinon un fichier `cover.*` (il n'apparaît alors pas dans la galerie), sinon la première photo du dossier.
- Formats acceptés : jpg, jpeg, png, webp, tif, avif.

### 3. C'est tout

`npm run dev` (ou `npm run build`) génère automatiquement la carte de l'événement, sa page
`/evenements/<slug>/`, sa galerie, ses balises SEO, son image de partage et son entrée dans le sitemap.
Il apparaît sur la page Galeries (filtre de sa catégorie) et dans « Derniers reportages » sur l'accueil.

### Catégories (filtres de la page Galeries)

Une catégorie = un petit fichier `content/categories/<identifiant>.json` (`{ "name": "Top 12", "order": 1 }`).
Elles s'affichent comme filtres sur `/evenements/` (Toutes · Top 12 · Nationale 2 · Pré-Nationale · Tournois ·
Événements), dans l'ordre de `order`.

| Je veux… | Comment faire |
| --- | --- |
| **Créer une catégorie** | Admin → Catégories → Nouveau, ou bouton « Ajouter Catégorie » directement dans la fiche d'un reportage. |
| **Renommer** | Admin → Catégories → modifier le nom. Les reportages stockent l'identifiant (`top-12`), pas le nom : ils suivent automatiquement. |
| **Changer l'ordre des filtres** | Admin → Catégories → « Réorganiser », puis glisser-déposer. |
| **Supprimer** | Admin → Catégories → Supprimer (l'admin signale les reportages qui l'utilisent encore). |

Le champ `"competition"` d'un reportage contient l'identifiant de sa catégorie (`"pre-nationale"`). Un ancien nom
complet (« Pré-Nationale ») est aussi reconnu ; une valeur inconnue crée un filtre à part plutôt que de perdre le
reportage.

### `event.json` — tous les champs

```json
{
  "title": "Pré-Nationale • Journée 1",
  "date": "2026-09-19",
  "competition": "pre-nationale",
  "location": "Chambly",
  "matches": ["BC Chambly — Béthune"],
  "description": "Première journée de la saison à domicile…",
  "gallery": ["DSC_5518.webp", "DSC_5229.webp"],
  "cover": "",
  "download": true,
  "downloadUrl": "https://drive.google.com/…"
}
```

| Champ | Obligatoire | Rôle |
| --- | --- | --- |
| `title` | oui | Titre affiché. Le « • » ne passe jamais seul en début de ligne. |
| `date` | oui | `"2026-09-19"` (recommandé) ou `"19 septembre 2026"`. Sert au tri et à l'affichage. |
| `competition` | non | Identifiant de la catégorie (voir ci-dessus). |
| `matches` | non | Rencontres du jour : `["BC Chambly — Béthune"]`. Affichées dans la fiche du reportage. |
| `gallery` | non | Photos et ordre de la galerie. Par défaut : tout le dossier, par nom de fichier. |
| `cover` | non | Couverture imposée. Par défaut : la première photo de `gallery`, sinon un fichier `cover.*`, sinon la première du dossier. |
| `coverPosition` | non | Point focal de la couverture, comme en CSS : `"50% 40%"`. |
| `download` | non | `true` = bouton « Télécharger » sur chaque photo de la visionneuse. |
| `downloadUrl` | non | Lien vers l'album complet (Drive, WeTransfer…), affiché si `download` est `true`. |
| `location`, `venue` | non | Ville, et salle / gymnase éventuel. |
| `description` | non | Une ou deux phrases sur la journée. |
| `sport` | non | « Badminton » par défaut (utilisé pour le référencement). |
| `dateEnd` | non | Pour un événement sur plusieurs jours → « 23 – 24 mai 2026 ». |
| `slug` | non | Adresse de la page. Par défaut : le nom du dossier. |
| `seoTitle`, `seoDescription` | non | Pour remplacer le titre / la description générés automatiquement. |
| `draft` | non | `true` = visible en développement, absent du site publié. |
| `teams`, `type`, `category`, `id`, `year`, `season` | non | Anciens champs, conservés pour compatibilité. |

Supprimer un événement = supprimer son dossier.

---

## Changer la grande photo de l'accueil

Admin → Réglages du site → « Grande photo de l'accueil » : choisissez un ou plusieurs reportages, leur couverture
s'affiche en grand (fondu enchaîné s'il y en a plusieurs). Dans `content/site.json` :

```json
"hero": {
  "slides": [
    { "event": "pre-nationale-j1-chambly", "photo": "cover", "position": "48% 20%" }
  ]
}
```

- `photo` : `"cover"` ou un nom de fichier du dossier ; `position` : point focal du recadrage.
- Liste vide = la couverture du dernier reportage.

Le reste de l'accueil se met à jour seul : la carte « Galeries » prend la couverture d'un reportage récent,
la mosaïque « Les images de la saison » pioche 7 photos dans les reportages récents, et « Derniers reportages »
montre les 3 plus récents.

## Les autres contenus

| Fichier | Contenu |
| --- | --- |
| `content/prestations.json` | Page Prestations : titre, introduction et les prestations (photo, texte, points forts, type présélectionné dans le formulaire de contact). |
| `content/site.json` | Nom, sous-titre, e-mail, réseaux sociaux, grande photo de l'accueil, bandeau de la page Galeries, formulaire, mentions légales. |
| `content/categories/` | Catégories (filtres de la page Galeries). |
| `content/images/` | Images hors reportages (prestations, bandeau). |
| `media.config.mjs` | Tailles, formats (AVIF / WebP) et qualité des images générées. |
| `src/styles/global.css` | Couleurs (`--bg`, `--accent`…), typographie, espacements. |

### Ajuster la taille générale

Trois réglages, en haut de `src/styles/global.css`, pilotent l'échelle de tout le site :

| Réglage | Effet |
| --- | --- |
| `html { font-size: 100%; }` | Taille de base (16 px). `93.75%` = plus petit : textes, boutons et espacements suivent. |
| `--gutter` | Marges latérales sur grand écran. Plus elles sont larges, plus les photos (cartes, galeries) sont petites. |
| `--page-max` | Largeur maximale du contenu sur les très grands écrans. |

Les grands titres ont chacun leur `font-size: clamp(min, fluide, max)` dans le composant ou la page concernés.

### Polices

Les mêmes que sur le site historique, hébergées avec le site (aucun appel à Google Fonts) :

- **Archivo** — titres en graisse 900, largeur normale, interlettrage serré (`.display` dans `global.css`) ;
  menu en 600, boutons en 700, texte courant en 400 ;
- **JetBrains Mono** — sur-titres, compteurs, dates.

Pour changer de police : installer le paquet Fontsource voulu, l'importer en tête de `global.css` et modifier
`--font-sans` / `--font-mono`. Si la police des titres change, remesurer la table de `src/lib/type-metrics.ts`
(elle sert à caler les titres de Contact dans leur colonne).

### Formulaire de contact

Sans configuration, le bouton « Envoyer ma demande » prépare un e-mail complet dans la messagerie du
visiteur (aucun service tiers). Pour recevoir les demandes directement, créez un formulaire chez
[Formspree](https://formspree.io), [Web3Forms](https://web3forms.com) ou équivalent, puis :

```json
"contact": {
  "formEndpoint": "https://formspree.io/f/xxxxxxxx",
  "hiddenFields": {}
}
```

(`hiddenFields` sert aux services qui demandent une clé, ex. `{ "access_key": "…" }` pour Web3Forms.)

### À compléter avant la mise en ligne

- `content/site.json` → bloc `legal` (éditeur, SIRET, adresse, hébergeur). Tant qu'un champ est vide,
  un repère **[À compléter]** s'affiche sur les pages légales.
- Remplacer les photos de démonstration : supprimez le contenu de `content/evenements/` et de
  `content/images/`, puis ajoutez vos événements. (`npm run demo-photos` régénère des images de
  démonstration dans les dossiers vides.)

---

## Images : comment ça marche

`npm run dev` et `npm run build` lancent automatiquement `npm run photos` :

- chaque photo est déclinée en **AVIF + WebP**, en 480 / 960 / 1440 / 2048 px (+ 2560 px pour les couvertures) ;
- les galeries n'affichent que des **miniatures**, chargées au défilement (lazy-loading) ; la visionneuse charge
  ensuite la taille adaptée à l'écran. **Les originaux ne sont jamais publiés** ;
- aperçu flou / couleur dominante pendant le chargement, dimensions réservées : aucun saut de mise en page ;
- le traitement est **incrémental** (une photo déjà traitée n'est jamais refaite) et les fichiers portent une
  empreinte dans leur nom → cache navigateur d'un an sans risque (`public/_headers`, `public/.htaccess`) ;
- le copyright est inscrit dans les métadonnées de chaque image publiée ;
- une image de partage 1200 × 630 est créée pour chaque événement (WhatsApp, Instagram, Facebook…).

Première passe : environ 1 à 2 s par photo (l'AVIF est lent à encoder). Pour aller ~5× plus vite,
mettez `formats: ['webp']` dans `media.config.mjs`. `npm run photos:force` régénère tout.

Les fichiers générés vivent dans `public/media/` et leur inventaire dans `src/generated/media.json`.

---

## Publier le site

`npm run build` produit un site 100 % statique dans `dist/`, compatible avec n'importe quel hébergeur.

- **Le plus simple** : envoyer le contenu de `dist/` sur votre hébergement (FTP/SFTP, OVH, o2switch, NAS…),
  ou le glisser-déposer sur Netlify / Cloudflare Pages.
- **Via Git** (Netlify, Cloudflare Pages, Vercel, GitHub Pages) : commande `npm run build`, dossier `dist`.
  Versionnez alors `public/media/` et `src/generated/media.json` : le serveur de build n'aura rien à
  recalculer, même sans les photos sources. Vous pouvez dans ce cas ignorer les photos sources (lignes
  prêtes à décommenter dans `.gitignore`).
- **Gros volumes** : quand `public/media/` devient trop lourd pour l'hébergeur, déposez ce dossier sur un
  stockage dédié (Cloudflare R2, S3, sous-domaine…) et indiquez son adresse dans `content/site.json` →
  `"mediaBaseUrl": "https://media.shootbytheo.com"`.

Pensez à vérifier `"url"` dans `content/site.json` : il sert aux adresses canoniques, au sitemap et aux images de partage.

## Structure

```
content/            ← tout ce qui se modifie au quotidien (reportages, catégories, textes, réglages)
public/             ← favicon, fichiers de cache, media/ (images générées) et admin/ (interface CMS)
public/admin/       ← Sveltia CMS : config.yml décrit les mêmes champs que ce README
scripts/            ← pipeline d'images, création d'événement, photos de démo
src/
  components/       ← en-tête, pied de page, carte, galerie masonry, visionneuse (zoom, téléchargement)…
  layouts/          ← gabarit commun (SEO, Open Graph, données structurées)
  lib/              ← lecture des événements, images, dates, métriques typographiques
  pages/            ← accueil, galeries (/evenements/), reportage, prestations, à propos, contact, pages légales
  styles/global.css ← système visuel
```
