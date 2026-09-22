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

En plus des commandes ci-dessous, tout (événements, catégories, photos, textes du site) peut se
gérer depuis une interface visuelle : **[Sveltia CMS](https://sveltiacms.app)**, un panneau qui lit
et écrit directement les mêmes fichiers que les commandes `npm run …`. Les deux approches restent
utilisables à tout moment, y compris sur le même événement.

### Utilisation locale (déjà prête, sans rien configurer)

1. `npm run dev`
2. Ouvrir **http://localhost:4321/admin/index.html** dans **Chrome ou Edge** (nécessaire : Firefox
   et Safari ne sont pas compatibles avec cette interface).
3. Cliquer **« Travailler avec un dépôt local »**, puis sélectionner le dossier du projet
   (`new sbt`) quand le navigateur le demande.
4. C'est tout : créer/modifier un événement, glisser des photos, changer un texte du site… chaque
   sauvegarde écrit directement les fichiers, exactement comme si vous les modifiiez à la main.

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
- **Couverture** : le fichier `cover.*` s'il existe (il n'apparaît alors pas dans la galerie), sinon le fichier indiqué
  par `"cover"` dans `event.json`, sinon la première photo.
- Formats acceptés : jpg, jpeg, png, webp, tif, avif.

### 3. C'est tout

`npm run dev` (ou `npm run build`) génère automatiquement la carte de l'événement, sa page
`/evenements/<slug>/`, sa galerie, ses balises SEO, son image de partage et son entrée dans le sitemap.
Il apparaît sur la page Événements, rangé par saison, sport et compétition.

### Créer, changer et gérer les catégories (Top 12, Pré-Nationale…)

**Il n'y a pas de liste des catégories à tenir à jour quelque part.** Une « catégorie » — au sens des
sections titrées sur `/evenements/` (Top 12, Pré-Nationale, Nationale 2…) — est simplement la valeur du
champ `"competition"` dans `event.json`. Dès qu'un événement porte une nouvelle valeur, sa section apparaît
automatiquement, avec le bon décompte de journées et le bon regroupement par saison. Il n'y a rien à
déclarer ni à configurer ailleurs.

| Je veux… | Comment faire |
| --- | --- |
| **Voir les catégories actuelles** | `npm run categories` — liste tout ce que `/evenements/` affiche en ce moment, par univers. |
| **Créer une catégorie** | `npm run new-event -- --competition "Nationale 2" …` (ou en réponse à la question « Compétition » du mode interactif). Le premier événement avec ce nom crée la section. |
| **Renommer une catégorie** | `npm run rename-category -- "Ancien nom" "Nouveau nom"` — renomme d'un coup tous les événements concernés (inutile de modifier les fichiers un par un). |
| **Fusionner deux catégories** | `npm run rename-category -- "Nom A" "Nom B"` — les événements de A rejoignent B. |
| **Supprimer une catégorie** | Supprimez ses événements (dossiers), ou renommez-les vers une autre catégorie : la section disparaît d'elle-même dès qu'elle n'a plus aucun événement. |

Rappels utiles :

- Un événement **sans** `"competition"` (tournoi, cérémonie, événement spécial…) ne crée pas sa propre
  section : il rejoint le bloc commun « Autres événements » de son sport et de sa saison, distingué
  seulement par son `"type"` sur la carte.
- Les trois **univers** (Badminton / Autres sports / Événementiel — les filtres en haut de la page) sont un
  niveau au-dessus des catégories, contrôlés par `"category"` (voir le tableau des champs ci-dessous).
- Si vous éditez les `event.json` pendant que `npm run dev` tourne, le changement est visible en
  quelques secondes, sans redémarrer. S'il ne se met pas à jour après avoir modifié `package.json` ou
  `astro.config.mjs`, relancez `npm run dev`.

### `event.json` — tous les champs

```json
{
  "title": "Pré-Nationale • Journée 1",
  "slug": "pre-nationale-j1-chambly",
  "date": "2026-09-19",
  "sport": "Badminton",
  "competition": "Pré-Nationale",
  "location": "Chambly",
  "description": "Première journée de la saison à domicile…",
  "cover": "cover.jpg",
  "coverPosition": "50% 40%"
}
```

| Champ | Obligatoire | Rôle |
| --- | --- | --- |
| `title` | oui | Titre affiché. Le « • » sépare les deux lignes du titre sur la page de l'événement. |
| `date` | oui | `"2026-09-19"` (recommandé) ou `"19 septembre 2026"`. Sert au tri, à l'affichage et à la saison. |
| `dateEnd` | non | Pour un événement sur plusieurs jours → « 23 – 24 mai 2026 ». |
| `slug` | non | Adresse de la page. Par défaut : le nom du dossier. |
| `id` | non | Identifiant libre, non utilisé par le site. |
| `sport` | non | « Badminton », « Athlétisme »… |
| `competition` | non | « Pré-Nationale », « Top 12 », « Nationale 2 »… Regroupe les journées sur la page Événements. **Vide** = rangé dans « Autres événements ». |
| `type` | non | « Tournoi », « Cérémonie », « Événement spécial »… (affiché quand il n'y a pas de compétition). |
| `category` | non | Filtre de la page Événements : `badminton`, `autres-sports` ou `evenementiel`. Par défaut : `badminton` si le sport est le badminton, sinon `autres-sports`. |
| `location`, `venue` | non | Ville, et salle / gymnase éventuel. |
| `teams` | non | `["BC Chambly", "…"]` — équipes ou participants. |
| `description` | non | Une ou deux phrases sur la journée. |
| `cover` | non | Nom du fichier de couverture dans le dossier. |
| `coverPosition` | non | Point focal de la couverture, comme en CSS : `"50% 40%"` (horizontal, vertical). Utile pour les recadrages mobile et l'image de partage. |
| `gallery` | non | `["012.jpg", "003.jpg"]` pour imposer une sélection et un ordre. Par défaut : tout le dossier. |
| `year`, `season` | non | Calculés depuis la date (saison = à partir du 1er août). À renseigner seulement pour forcer une valeur, ex. `"season": "2026 / 2027"`. |
| `seoTitle`, `seoDescription` | non | Pour remplacer le titre / la description générés (« Pré-Nationale Badminton • Journée 1 à Chambly \| ShootByTheo »). |
| `draft` | non | `true` = visible en développement, absent du site publié. |

Supprimer un événement = supprimer son dossier.

---

## Changer l'image à la une

L'accueil n'affiche **que** les photos à la une, en plein écran, avec une ligne de pied de page : pas de
sections en dessous, chaque rubrique (Événements, Prestations, À propos, Contact) a sa propre page dans le menu.

Dans `content/site.json` :

```json
"hero": {
  "autoplaySeconds": 7,
  "slides": [
    { "event": "pre-nationale-j1-chambly", "photo": "cover", "position": "50% 40%" },
    { "event": "top-12-j1-chambly", "photo": "014.jpg", "position": "60% 30%" }
  ]
}
```

- `event` : le slug (ou le dossier) de l'événement ; `photo` : `"cover"` ou un nom de fichier du dossier.
- `position` : point focal pour le recadrage plein écran.
- Une seule diapositive = image fixe. Liste vide = les trois derniers événements passent à la une.

## Les autres contenus

| Fichier | Contenu |
| --- | --- |
| `content/site.json` | Nom, slogan, e-mail, réseaux sociaux, image à la une, formulaire, mentions légales, `logo` (chemin d'un logo placé dans `public/`, ex. `"/logo.svg"`). |
| `content/prestations.json` | Les prestations : titres, textes, listes, image (dans `content/images/`). |
| `content/a-propos.json` | Texte et photo de la page À propos. |
| `content/images/` | Images hors événements (à propos, prestations). |
| `media.config.mjs` | Tailles, formats (AVIF / WebP) et qualité des images générées. |
| `src/styles/global.css` | Couleurs (`--accent`…), typographie, espacements. |

### Ajuster la taille générale

Trois réglages, en haut de `src/styles/global.css`, pilotent l'échelle de tout le site :

| Réglage | Effet |
| --- | --- |
| `html { font-size: 93.75%; }` | Taille de base (15 px). `100%` = plus grand, `87.5%` = plus petit : textes, boutons et espacements suivent. |
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
(elle sert à caler les titres de l'accueil, d'À propos et de Contact dans leur colonne).

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
content/            ← tout ce qui se modifie au quotidien (événements, textes, réglages)
public/             ← favicon, fichiers de cache, media/ (images générées) et admin/ (interface CMS)
public/admin/       ← Sveltia CMS : config.yml décrit les mêmes champs que ce README
scripts/            ← pipeline d'images, création d'événement, photos de démo
src/
  components/       ← en-tête, hero, carte, galerie masonry, visionneuse…
  layouts/          ← gabarit commun (SEO, Open Graph, données structurées)
  lib/              ← lecture des événements, images, dates, métriques typographiques
  pages/            ← accueil, événements, prestations, à propos, contact, pages légales
  styles/global.css ← système visuel
```
