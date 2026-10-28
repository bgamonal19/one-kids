/** Bounded reads from Wikimedia only; sending bytes avoids provider-side thumbnail URL failures. */
export async function referenceDataUrl(url, fetcher = fetch) {
  if (!/^https:\/\/(?:upload|thumb)\.wikimedia\.org\//.test(url)) throw Error('Invalid image source');
  const response = await fetcher(url,{signal:AbortSignal.timeout(7000),headers:{'User-Agent':'ONE-KIDS-tutor/1.0 (https://one-kids.vercel.app)'}});
  const mime=(response.headers.get('content-type')||'').split(';')[0];
  if(!response.ok||!['image/png','image/jpeg','image/webp'].includes(mime)) throw Error('Image unavailable');
  const reader=response.body?.getReader();if(!reader) throw Error('Empty image');
  const parts=[];let length=0;
  while(true){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>2500000){await reader.cancel();throw Error('Image too large');}parts.push(value);}
  if(!length)throw Error('Empty image');
  return `data:${mime};base64,${Buffer.concat(parts).toString('base64')}`;
}
