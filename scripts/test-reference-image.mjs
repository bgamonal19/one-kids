import test from 'node:test';
import assert from 'node:assert/strict';
import { verifiedReferenceImage } from '../server/reference-image.mjs';
import { runTutor, validateTutorRequest } from '../server/tutor-core.mjs';
const wiki = {query:{pages:[{title:'Corazón',fullurl:'https://es.wikipedia.org/wiki/Coraz%C3%B3n',thumbnail:{source:'https://upload.wikimedia.org/heart.jpg',width:800,height:800}}]}};
const response = value => Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}],usage:{total_tokens:88}});
test('internet alternative inspects the actual image and labels it with its source only after a positive verdict',async()=>{
 let inspected;
 const result=await verifiedReferenceImage({query:'Corazón',context:'Anatomía humana y circulación'},{OPENAI_API_KEY:'test'},async(url,options)=>{
  if(String(url).includes('wikipedia'))return Response.json(wiki);
  inspected=JSON.parse(options.body);return response({relevant:true,safe:true,caption:'Corazón humano: anatomía'});
 });
 assert.equal(result.photo.verified,true);assert.equal(result.tokens,88);assert.match(result.photo.page,/wikipedia/);
 assert.equal(inspected.input[0].content[1].image_url,'https://upload.wikimedia.org/heart.jpg');
 assert.match(inspected.input[0].content[0].text,/circulación/);
});
test('uncertain, unrelated or unsafe reference images never reach the child',async()=>{
 for(const verdict of [{relevant:false,safe:true},{relevant:true,safe:false},{relevant:'true',safe:true}]){
 const result=await verifiedReferenceImage({query:'Corazón',context:'corazón humano'},{OPENAI_API_KEY:'test'},async url=>String(url).includes('wikipedia')?Response.json(wiki):response(verdict));assert.equal(result.photo,null);
 }
});
test('annotation sends the original image to vision and does not request a replacement image',async()=>{
 let sent;
 const result=await runTutor({ageBand:'10-12',message:'Señala el ventrículo',annotationImage:'https://upload.wikimedia.org/heart.jpg',history:[],pictures:true},{OPENAI_API_KEY:'test'},async(_,options)=>{sent=JSON.parse(options.body);return response({reply:'El ventrículo está señalado.',visual:{type:'sketch',title:'Corazón',shapes:[{s:'line',x1:10,y1:10,x2:50,y2:65,color:'red',arrow:true}]}});});
 assert.equal(sent.input.at(-1).content[0].image_url,'https://upload.wikimedia.org/heart.jpg');
 assert.match(sent.instructions,/ANOTACIÓN SOBRE IMAGEN/);assert.equal(result.visual.shapes[0].s,'line');assert.equal(result.picture,null);
 assert.throws(()=>validateTutorRequest({message:'Señala',annotationImage:'https://internal.example/image'}));
});
test('current Wikimedia thumbnail host is accepted and can be used for image annotations',async()=>{
 const current=structuredClone(wiki);current.query.pages[0].thumbnail.source='https://thumb.wikimedia.org/wikipedia/commons/thumb/heart.png/1000px-heart.png';
 const result=await verifiedReferenceImage({query:'Corazón',context:'corazón humano'},{OPENAI_API_KEY:'test'},async url=>String(url).includes('wikipedia.org/w/api')?Response.json(current):response({relevant:true,safe:true,caption:'Corazón humano'}));
 assert.equal(result.photo.verified,true);assert.match(result.photo.url,/thumb.wikimedia/);
 assert.equal(validateTutorRequest({message:'Señala la aorta',annotationImage:result.photo.url}).annotationImage,result.photo.url);
});
