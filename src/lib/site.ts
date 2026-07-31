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
  bgImages: string[];
}

export const siteConfig = siteConfigJson as SiteConfig;
