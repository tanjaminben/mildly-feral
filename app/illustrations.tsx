/* eslint-disable @next/next/no-img-element -- These local raster illustrations render their full canvases. */
import type { recipeShelf } from "@/lib/content";

type RecipeId = (typeof recipeShelf)[number]["id"];

const recipeImages: Record<RecipeId, { file: string; alt: string }> = {
  kit: {
    file: "recipe-hazy-session.png",
    alt: "The Mildly Feral fox at a woodland picnic with golden IPA, leafy hops, citrus, and drifting haze.",
  },
  kama: {
    file: "recipe-kama-citra.png",
    alt: "The Mildly Feral fox in a citrus grove, leaning on a hop basket beside a golden IPA.",
  },
  sumpin: {
    file: "recipe-wheat-ipa.png",
    alt: "The Mildly Feral fox sneaking hops from a sack among golden wheat, with an amber IPA at sunset.",
  },
  jabba: {
    file: "recipe-tropical-hazy.png",
    alt: "The Mildly Feral fox with a hazy IPA in a cosmic hop garden, beneath hop comets, an eclipse, and a galaxy.",
  },
};

export function BrewArt() {
  return (
    <img
      className="brew-art"
      src="/images/brewing/brew-bench.png"
      alt="The Mildly Feral fox with a notebook beside a glass fermentation jug and hops on a brewing bench."
      width={1536}
      height={1024}
      decoding="async"
    />
  );
}

export function RecipeArt({ recipeId }: { recipeId: RecipeId }) {
  const image = recipeImages[recipeId];
  return (
    <img
      className="recipe-art"
      src={`/images/brewing/${image.file}`}
      alt={image.alt}
      width={1536}
      height={1024}
      loading="lazy"
      decoding="async"
    />
  );
}
