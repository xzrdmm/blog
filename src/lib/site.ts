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
  featuredProjects: string[];
  featuredSongs: string[];
  goatcounterSite: string;
  bgImages: string[];
}

export const siteConfig: SiteConfig = {
  title: siteConfigJson.title || '我的博客',
  bio: siteConfigJson.bio ?? '',
  avatar: siteConfigJson.avatar || '/images/avatar.svg',
  social: {
    github: siteConfigJson.social?.github ?? '',
    email: siteConfigJson.social?.email ?? '',
  },
  themeColors: siteConfigJson.themeColors ?? [],
  wallpaper: siteConfigJson.wallpaper ?? '',
  wallpaperOpacity: siteConfigJson.wallpaperOpacity ?? '0.4',
  enableParticles: siteConfigJson.enableParticles ?? true,
  enableAurora: siteConfigJson.enableAurora ?? true,
  featuredPosts: siteConfigJson.featuredPosts ?? [],
  featuredProjects: siteConfigJson.featuredProjects ?? [],
  featuredSongs: siteConfigJson.featuredSongs ?? [],
  goatcounterSite: siteConfigJson.goatcounterSite ?? '',
  bgImages: siteConfigJson.bgImages ?? [],
};
