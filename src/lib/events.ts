import { getCollection } from 'astro:content';
import { formatEventDate, isoDate, seasonOf } from './dates';
import { coverPhoto, galleryPhotos, ogImage, type Photo } from './media';

export type Category = 'badminton' | 'autres-sports' | 'evenementiel';

export const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'badminton', label: 'Badminton' },
  { id: 'autres-sports', label: 'Autres sports' },
  { id: 'evenementiel', label: 'Événementiel' },
];

export interface SiteEvent {
  /** Nom du dossier dans content/evenements/. */
  folder: string;
  slug: string;
  url: string;
  title: string;
  date: Date;
  dateEnd?: Date;
  dateLabel: string;
  isoDate: string;
  year: number;
  season: string;
  seasonId: string;
  sport: string;
  competition: string;
  type: string;
  category: Category;
  location: string;
  venue: string;
  teams: string[];
  description: string;
  cover?: Photo;
  coverPosition: string;
  photos: Photo[];
  /** Étiquette courte affichée sur les cartes : "Badminton · Pré-Nationale". */
  tag: string;
  seoTitle: string;
  seoDescription: string;
  ogImage?: string;
}

const lower = (value: string) => value.toLocaleLowerCase('fr');
const stripAccents = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '');

/** "à Chambly", "au Havre", "aux Ulis". */
function atPlace(location: string): string {
  if (/^le\s/i.test(location)) return `au ${location.slice(3)}`;
  if (/^les\s/i.test(location)) return `aux ${location.slice(4)}`;
  return `à ${location}`;
}

/** "Pré-Nationale • Journée 1" → "Pré-Nationale Badminton • Journée 1 à Chambly". */
function buildSeoTitle(title: string, sport: string, competition: string, location: string): string {
  let result = title;
  const mentionsSport = sport && lower(result).includes(lower(sport));
  if (sport && !mentionsSport) {
    result = competition && result.startsWith(competition) ? result.replace(competition, `${competition} ${sport}`) : `${result} • ${sport}`;
  }
  if (location && !lower(result).includes(lower(location))) result += ` ${atPlace(location)}`;
  return result;
}

function truncate(text: string, max = 158): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), 60)).replace(/[\s,;:.–—-]+$/, '')}…`;
}

let cache: Promise<SiteEvent[]> | undefined;

/** Tous les événements publiés, du plus récent au plus ancien. */
export function getEvents(): Promise<SiteEvent[]> {
  cache ??= loadEvents();
  return cache;
}

async function loadEvents(): Promise<SiteEvent[]> {
  const entries = await getCollection('events', ({ data }) => import.meta.env.DEV || !data.draft);

  const events = entries.map((entry): SiteEvent => {
    const { data } = entry;
    const folder = entry.id;
    const slug = data.slug ?? folder;
    const photos = galleryPhotos(folder, data.gallery);
    const cover = coverPhoto(folder);

    const category: Category = data.category ?? (stripAccents(lower(data.sport)) === 'badminton' ? 'badminton' : 'autres-sports');
    const dateLabel = formatEventDate(data.date, data.dateEnd);
    const tag = [data.sport, data.competition || data.type].filter(Boolean).join(' · ');

    const seoTitle = data.seoTitle ?? buildSeoTitle(data.title, data.sport, data.competition, data.location);
    const autoDescription = `${seoTitle} — ${dateLabel}. ${photos.length > 1 ? `Galerie de ${photos.length} photos` : 'Reportage'} par ShootByTheo, photographe et vidéaste sportif.`;
    // La description de l'événement, suivie de la date et du lieu quand la place le permet.
    const context = [dateLabel, data.location].filter(Boolean).join(', ');
    const described = data.description && `${data.description} ${context}.`.length <= 158 ? `${data.description} ${context}.` : data.description;

    return {
      folder,
      slug,
      url: `/evenements/${slug}/`,
      title: data.title,
      date: data.date,
      dateEnd: data.dateEnd,
      dateLabel,
      isoDate: isoDate(data.date),
      year: data.year ?? data.date.getUTCFullYear(),
      season: data.season ?? seasonOf(data.date),
      seasonId: (data.season ?? seasonOf(data.date)).replace(/[^0-9]+/g, '-').replace(/^-|-$/g, ''),
      sport: data.sport,
      competition: data.competition,
      type: data.type,
      category,
      location: data.location,
      venue: data.venue,
      teams: data.teams,
      description: data.description,
      cover,
      coverPosition: data.coverPosition,
      photos,
      tag,
      seoTitle,
      seoDescription: truncate(data.seoDescription ?? (described || autoDescription)),
      ogImage: ogImage(folder),
    };
  });

  const seen = new Map<string, string>();
  for (const event of events) {
    const other = seen.get(event.slug);
    if (other) throw new Error(`Deux événements utilisent le même slug "${event.slug}" : dossiers "${other}" et "${event.folder}".`);
    seen.set(event.slug, event.folder);
  }

  return events.sort((a, b) => b.date.getTime() - a.date.getTime() || a.title.localeCompare(b.title, 'fr'));
}

export interface CompetitionGroup {
  name: string;
  events: SiteEvent[];
}

export interface SportGroup {
  sport: string;
  competitions: CompetitionGroup[];
}

export interface SeasonGroup {
  season: string;
  id: string;
  count: number;
  sports: SportGroup[];
  /** Tournois, cérémonies, événements spéciaux… (sans championnat). */
  others: SiteEvent[];
}

/** Saison → sport → compétition. À l'intérieur d'une compétition, les journées sont dans l'ordre chronologique. */
export function groupBySeason(events: SiteEvent[]): SeasonGroup[] {
  const seasons: SeasonGroup[] = [];
  for (const event of events) {
    let season = seasons.find((s) => s.season === event.season);
    if (!season) {
      season = { season: event.season, id: event.seasonId, count: 0, sports: [], others: [] };
      seasons.push(season);
    }
    season.count++;

    if (!event.competition) {
      season.others.push(event);
      continue;
    }
    const sportName = event.sport || 'Sport';
    let sport = season.sports.find((s) => s.sport === sportName);
    if (!sport) {
      sport = { sport: sportName, competitions: [] };
      season.sports.push(sport);
    }
    let competition = sport.competitions.find((c) => c.name === event.competition);
    if (!competition) {
      competition = { name: event.competition, events: [] };
      sport.competitions.push(competition);
    }
    competition.events.push(event);
  }

  for (const season of seasons) {
    for (const sport of season.sports) {
      for (const competition of sport.competitions) competition.events.sort((a, b) => a.date.getTime() - b.date.getTime());
    }
  }
  return seasons.sort((a, b) => b.season.localeCompare(a.season));
}
