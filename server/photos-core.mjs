// Real pictures for the board: the lead image of the matching Wikipedia article.
// Article lead images are chosen by editors, so they suit children far better than open image search.
const UA = 'ONE-KIDS-tutor/1.0 (https://one-kids.vercel.app; educational app)';

const plain = text => String(text ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9ñ ]/g, ' ');
const stop = new Set(['el', 'la', 'los', 'las', 'un', 'una', 'de', 'del', 'en', 'y', 'o', 'con', 'por', 'para', 'al', 'su', 'sus', 'the', 'of', 'and', 'a', 'an', 'in', 'vista', 'desde', 'foto', 'imagen', 'dibujo']);
const words = text => plain(text).split(/\s+/).filter(w => w.length > 1 && !stop.has(w));
// Singular and plural count as the same word (tigre/tigres, país/países).
const same = (a, b) => [a, `${a}s`, `${a}es`].includes(b) || [`${b}s`, `${b}es`].includes(a);
/**
 * A search result is only trusted when its title is about what was asked: every word of the title must be in the
 * query. "Tierra" matches «La Tierra vista desde el espacio»; "Tierra Whack" (a singer) does not.
 */
export function titleMatches(title, query) {
  const t = words(title), q = words(query);
  return t.length > 0 && t.every(w => q.some(x => same(w, x)));
}

async function ask(params, lang, fetcher) {
  const response = await fetcher(`https://${lang}.wikipedia.org/w/api.php?${new URLSearchParams({ action: 'query', format: 'json', formatversion: '2', origin: '*', redirects: '1', prop: 'pageimages|info|pageprops', ppprop: 'disambiguation', piprop: 'thumbnail', pithumbsize: '1000', pilicense: 'free', inprop: 'url', ...params })}`, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA }, signal: AbortSignal.timeout(5000) });
  if (!response.ok) return [];
  return (await response.json())?.query?.pages ?? [];
}
const picture = page => page && !page.missing && !('disambiguation' in (page.pageprops ?? {})) && page.thumbnail?.source?.startsWith('https://upload.wikimedia.org/')
  ? { url: page.thumbnail.source, width: page.thumbnail.width, height: page.thumbnail.height, title: String(page.title).slice(0, 80), page: page.fullurl } : null;

async function lookup(query, lang, fetcher) {
  // First the article with exactly that name; a wrong photo is worse than none, so a search result must match the query.
  const exact = picture((await ask({ titles: query }, lang, fetcher))[0]);
  if (exact) return exact;
  const pages = await ask({ generator: 'search', gsrsearch: query, gsrlimit: '5', gsrnamespace: '0' }, lang, fetcher);
  const best = [...pages].sort((a, b) => (a.index ?? 99) - (b.index ?? 99)).find(p => titleMatches(p.title, query) && picture(p));
  return best ? picture(best) : null;
}

/** Turns the AI's image searches into real photos; a search without a picture keeps only its label. */
export async function findPhotos(images, fetcher = fetch) {
  const found = await Promise.all((images ?? []).slice(0, 3).map(async image => {
    try { return { ...image, ...(await lookup(image.query, 'es', fetcher) ?? await lookup(image.query, 'en', fetcher)) }; }
    catch { return image; }
  }));
  return found.filter(photo => photo.url).map(photo => ({ query: photo.query, label: photo.label, url: photo.url, width: photo.width, height: photo.height, title: photo.title, page: photo.page }));
}

/** A sketch that annotates a real photo gets that photo as its background; without one it stays a plain drawing. */
export async function attachBackground(visual, fetcher = fetch) {
  if (visual?.type !== 'sketch' || !visual.photo) return visual;
  const { photo, ...sketch } = visual;
  const [found] = await findPhotos([{ query: photo, label: visual.title }], fetcher).catch(() => []);
  return found ? { ...sketch, background: { url: found.url, width: found.width, height: found.height, title: found.title, page: found.page } } : sketch;
}

/** Broader candidates are ONLY for the vision-verified alternative, never for unverified board photos. */
export async function referenceCandidates(query, fetcher = fetch) {
  const groups = await Promise.all([
    ask({titles:query},'es',fetcher).catch(()=>[]),
    ask({generator:'search',gsrsearch:query,gsrlimit:'5',gsrnamespace:'0'},'es',fetcher).catch(()=>[]),
  ]);
  const seen = new Set();
  return groups.flat().map(picture).filter(p => p && !seen.has(p.url) && seen.add(p.url)).slice(0,2);
}
