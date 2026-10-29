import test from 'node:test';
import assert from 'node:assert/strict';
import { verifiedReferenceImage } from '../server/reference-image.mjs';
import { referenceDataUrl } from '../server/reference-file.mjs';
import { runTutor, validateTutorRequest } from '../server/tutor-core.mjs';
const image='https://thumb.wikimedia.org/wikipedia/commons/heart.png';
const wiki={query:{pages:[{title:'Corazón',fullurl:'https://es.wikipedia.org/wiki/Coraz%C3%B3n',thumbnail:{source:image,width:800,height:800}}]}};
const response=value=>Response.json({output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}],usage:{total_tokens:88}});
const fetcherFor=(verdict,inspect=()=>{})=>async(url,options)=>{
 if(String(url).includes('wikipedia.org/w/api'))return Response.json(wiki);
 if(String(url).includes('wikimedia.org'))return new Response(new Uint8Array([137,80,78,71]),{headers:{'content-type':'image/png'}});
 inspect(JSON.parse(options.body));return response(verdict);
};
test('internet alternative inspects actual image bytes and records the source only after a positive verdict',async()=>{
 let inspected;
 const result=await verifiedReferenceImage({query:'Corazón',context:'Anatomía humana y circulación'},{OPENAI_API_KEY:'test'},fetcherFor({relevant:true,safe:true,caption:'Corazón humano: anatomía'},body=>{inspected=body;}));
 assert.equal(result.photo.verified,true);assert.equal(result.tokens,88);assert.match(result.photo.page,/wikipedia/);
 assert.match(inspected.input[0].content[1].image_url,/^data:image\/png;base64,/);
 assert.match(inspected.input[0].content[0].text,/circulación/);
 assert.match(inspected.input[0].content[0].text,/JSON/);
});
test('uncertain, unrelated or unsafe reference images never reach the child',async()=>{
 for(const verdict of [{relevant:false,safe:true},{relevant:true,safe:false},{relevant:'true',safe:true}]){
  const result=await verifiedReferenceImage({query:'Corazón',context:'corazón humano'},{OPENAI_API_KEY:'test'},fetcherFor(verdict));assert.equal(result.photo,null);
 }
});
test('annotation sends original image bytes to vision and never requests a replacement image',async()=>{
 let sent;
 const result=await runTutor({ageBand:'10-12',message:'Señala el ventrículo',annotationImage:image,history:[],pictures:true},{OPENAI_API_KEY:'test'},fetcherFor({reply:'El ventrículo está señalado.',visual:{type:'sketch',title:'Corazón',shapes:[{s:'line',x1:10,y1:10,x2:50,y2:65,color:'red',arrow:true}]}},body=>{sent=body;}));
 assert.match(sent.input.at(-1).content[0].image_url,/^data:image\/png;base64,/);
 assert.match(sent.instructions,/ANOTACIÓN SOBRE IMAGEN/);assert.equal(result.visual.shapes[0].s,'line');assert.equal(result.picture,null);
 assert.throws(()=>validateTutorRequest({message:'Señala',annotationImage:'https://internal.example/image'}));
 assert.equal(validateTutorRequest({message:'Señala',annotationImage:image}).annotationImage,image);
});
test('reference downloads reject untrusted hosts, non-images and oversized images',async()=>{
 await assert.rejects(referenceDataUrl('https://internal.example/image'));
 await assert.rejects(referenceDataUrl(image,async()=>new Response('not an image')));
 await assert.rejects(referenceDataUrl(image,async()=>new Response(new Uint8Array(2500001),{headers:{'content-type':'image/png'}})));
});
test('a visual annotation returned without a separate reply is still rendered instead of failing as incomplete',async()=>{
 const result=await runTutor({ageBand:'10-12',message:'Señala el ventrículo',annotationImage:image,history:[]},{OPENAI_API_KEY:'test'},fetcherFor({visual:{type:'sketch',title:'Corazón',shapes:[{s:'line',x1:10,y1:10,x2:65,y2:70,color:'red',arrow:true}]},board:['El ventrículo izquierdo bombea sangre al cuerpo.']}));
 assert.match(result.reply,/bombea sangre/);assert.equal(result.visual.shapes.length,1);
});
test('independent annotation review corrects coordinates and requires a real explanation',async()=>{
 const {reviewAnnotation}=await import('../server/annotation-review.mjs');
 const original={reply:'Voy a dibujarlo',visual:{type:'sketch',title:'Corazón',shapes:[{s:'line',x1:40,y1:70,x2:30,y2:75,arrow:true,color:'red',fill:false}]},tokens:20};
 const checked=await reviewAnnotation(original,{message:'Señala el ventrículo izquierdo',annotationImage:'data:image/png;base64,iVBORw=='},{OPENAI_API_KEY:'test'},async()=>response({confirmed:true,reply:'El ventrículo izquierdo bombea sangre al cuerpo.',board:['Bombea sangre al cuerpo.'],shapes:[{s:'line',x1:90,y1:70,x2:73,y2:78,arrow:true,color:'red'}]}));
 assert.equal(checked.visual.shapes[0].x2,73);assert.match(checked.reply,/bombea/);assert.equal(checked.tokens,108);
 await assert.rejects(reviewAnnotation(original,{message:'Señala',annotationImage:'data:image/png;base64,iVBORw=='},{OPENAI_API_KEY:'test'},async()=>response({confirmed:false})));
});
test('dedicated photo annotation bypasses free-form chat and returns one complete, validated answer',async()=>{
 const {annotateImage}=await import('../server/annotation-review.mjs');let calls=0;
 const result=await annotateImage({message:'Corrige la flecha y escribe Ventrículo izquierdo',annotationImage:image,ageBand:'10-12'},{OPENAI_API_KEY:'test'},fetcherFor({confirmed:true,reply:'El ventrículo izquierdo bombea sangre al cuerpo.',board:['Bombea sangre oxigenada al cuerpo.'],shapes:[{s:'line',x1:90,y1:70,x2:73,y2:78,arrow:true,color:'red'},{s:'text',x:75,y:95,text:'Ventrículo izquierdo',size:4,color:'red'}]},()=>{calls++;}));
 assert.equal(calls,1);assert.equal(result.source,'openai');assert.match(result.reply,/bombea/);assert.equal(result.visual.shapes.length,2);assert.equal(result.picture,null);
});
