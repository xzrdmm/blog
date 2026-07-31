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
  bgImages: string[];
}

export const siteConfig = siteConfigJson as SiteConfig;
