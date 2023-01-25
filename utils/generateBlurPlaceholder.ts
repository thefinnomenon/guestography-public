import imagemin from "imagemin";
import imageminJpegtran from "imagemin-jpegtran";

const cache = new Map<string, string>();

export default async function getBase64ImageUrl(
  imageUrl: string
): Promise<string> {
  let cachedUrl = cache.get(imageUrl);
  if (cachedUrl) return cachedUrl;

  const response = await fetch(imageUrl);
  const buffer = await response.arrayBuffer();
  const minified = await imagemin.buffer(Buffer.from(buffer), {
    plugins: [imageminJpegtran()],
  });

  const url = `data:image/jpeg;base64,${Buffer.from(minified).toString(
    "base64"
  )}`;
  cache.set(imageUrl, url);
  return url;
}
