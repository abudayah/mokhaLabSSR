export type SocialPlatform = "instagram" | "youtube" | "tiktok" | "twitter" | "facebook"

export interface SocialLink {
  platform: SocialPlatform
  url: string
  label: string
}

export const socialLinks: SocialLink[] = [
  {
    platform: "instagram",
    url: "https://www.instagram.com/mokhalab.ca",
    label: "Follow mokhaLab on Instagram",
  },
  {
    platform: "facebook",
    url: "https://www.facebook.com/mokhalab.ca",
    label: "Follow mokhaLab on Facebook",
  },
  {
    platform: "youtube",
    url: "https://www.youtube.com/@mokhalab",
    label: "Watch mokhaLab on YouTube",
  },
  {
    platform: "tiktok",
    url: "https://www.tiktok.com/@mokhalab",
    label: "Follow mokhaLab on TikTok",
  },
]
