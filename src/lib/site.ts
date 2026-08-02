import siteConfigJson from '../siteConfig.json';

export interface SiteConfig {
  title: string;
  bio: string;
  avatar: string;
  social: {
    github: string;
    email: string;
  };
  themeColors: string[];
  wallpaper: string;
  wallpaperOpacity: string;
  enableParticles: boolean;
  enableAurora: boolean;
  featuredPosts: string[];
  featuredSongs: string[];
  goatcounterSite: string;
  bgImages: string[];
}

// Keystatic 保存时会省略空的可选字段，因此读取端对缺失字段做兜底
const raw = siteConfigJson as unknown as Record<string, unknown>;

const str = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;
const bool = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;
const strArr = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

const socialRaw =
  typeof raw.social === 'object' && raw.social !== null
    ? (raw.social as Record<string, unknown>)
    : {};

export const siteConfig: SiteConfig = {
  title: str(raw.title, '我的博客'),
  bio: str(raw.bio),
  avatar: str(raw.avatar, '/images/avatar.svg'),
  social: {
    github: str(socialRaw.github),
    email: str(socialRaw.email),
  },
  themeColors: strArr(raw.themeColors),
  wallpaper: str(raw.wallpaper),
  wallpaperOpacity: str(raw.wallpaperOpacity, '0.4'),
  enableParticles: bool(raw.enableParticles, true),
  enableAurora: bool(raw.enableAurora, true),
  featuredPosts: strArr(raw.featuredPosts),
  featuredSongs: strArr(raw.featuredSongs),
  goatcounterSite: str(raw.goatcounterSite),
  bgImages: strArr(raw.bgImages),
};
