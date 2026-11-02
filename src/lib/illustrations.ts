import map from "../../public/image-map.json";

export type IllustrationKey = keyof typeof map.assets;

export type IllustrationAsset = {
  src: string;
  width: number;
  height: number;
  alt: string;
  objectPosition: string;
  caption: string;
};

export const illustrations = map.assets as Record<IllustrationKey, IllustrationAsset>;
