// Real pictures for the board: the lead image of the matching Wikipedia article.
// Article lead images are chosen by editors, so they suit children far better than open image search.
const UA = 'ONE-KIDS-tutor/1.0 (https://one-kids.vercel.app; educational app)';

async function lookup(query, lang, fetcher) {
  const params = new URLSearchParams({
    action: 'query', format: 'json', formatversion: '2', origin: '*', redirects: '1',
    generator: 'search', gsrsearch: query, gsrlimit: '3', gsrnamespace: '0',
    prop: 'pageimages|info', piprop: 'thumbnail', pithumbsize: '1000', pilicense: 'free', inprop: 'url',
  });
  const response = await fetcher(`https://${lang}.wikipedia.org/w/api.php?${params}`, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA }, signal: AbortSignal.timeout(5000) });
  if (!response.ok) return null;
  const pages = (await response.json())?.query?.pages ?? [];
  const page = [...pages].sort((a, b) => (a.index ?? 99) - (b.index ?? 99)).find(p => p.thumbnail?.source?.startsWith('https://upload.wikimedia.org/'));
  return page ? { url: page.thumbnail.source, width: page.thumbnail.width, height: page.thumbnail.height, title: String(page.title).slice(0, 80), page: page.fullurl } : null;
}

/** Turns the AI's image searches into real photos; a search without a picture keeps only its label. */
export async function findPhotos(images, fetcher = fetch) {
  const found = await Promise.all((images ?? []).slice(0, 3).map(async image => {
    try { return { ...image, ...(await lookup(image.query, 'es', fetcher) ?? await lookup(image.query, 'en', fetcher)) }; }
    catch { return image; }
  }));
  return found.filter(photo => photo.url).map(photo => ({ query: photo.query, label: photo.label, url: photo.url, width: photo.width, height: photo.height, title: photo.title, page: photo.page }));
}
