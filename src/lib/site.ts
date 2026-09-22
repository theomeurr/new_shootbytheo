import siteData from '@content/site.json';

export interface Social {
  label: string;
  handle: string;
  url: string;
}

export const site = {
  ...siteData,
  url: siteData.url.replace(/\/+$/, ''),
  socials: siteData.socials as Social[],
};

export const instagram = site.socials.find((social) => social.label.toLowerCase() === 'instagram') ?? site.socials[0];

export const NAV = [
  { label: 'Accueil', href: '/' },
  { label: 'Événements', href: '/evenements/' },
  { label: 'Prestations', href: '/prestations/' },
  { label: 'Contact', href: '/contact/' },
] as const;

/** Options du menu « Type de prestation » du formulaire de contact. */
export const SERVICE_OPTIONS = ['Photographie', 'Vidéo', 'Photo + Vidéo', 'Réseaux sociaux', 'Autre'] as const;

/** URL absolue (balises canonical, Open Graph, données structurées). */
export const absoluteUrl = (pathOrUrl: string) => (/^https?:\/\//.test(pathOrUrl) ? pathOrUrl : new URL(pathOrUrl, `${site.url}/`).href);

export const isActive = (href: string, pathname: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href.replace(/\/$/, '')));
