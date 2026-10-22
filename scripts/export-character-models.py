"""Export the studio scene primitives as self-contained glTF 2.0 GLB models.
Includes named whole-character motion clips (no skeletal rig or facial blendshapes).
"""
import importlib.util
import json
import math
from pathlib import Path
import struct
import numpy as np

spec=importlib.util.spec_from_file_location('renderer',Path(__file__).with_name('render-characters.py'))
renderer=importlib.util.module_from_spec(spec); spec.loader.exec_module(renderer)
OUT=Path(__file__).resolve().parents[1]/'assets/characters/models'
OUT.mkdir(parents=True,exist_ok=True)

def sphere():
    p=[]; idx=[]; rings=16; sides=24
    for i in range(rings+1):
        t=math.pi*i/rings
        for j in range(sides+1):
            a=2*math.pi*j/sides
            p.append([math.sin(t)*math.cos(a),math.cos(t),math.sin(t)*math.sin(a)])
    for i in range(rings):
        for j in range(sides):
            a=i*(sides+1)+j; b=a+sides+1
            if i>0: idx.extend([a,a+1,b])
            if i<rings-1: idx.extend([a+1,b+1,b])
    return p,p,idx

def cube():
    p=[];n=[];idx=[]
    for axis in range(3):
        for sign in [-1,1]:
            normal=np.zeros(3);normal[axis]=sign
            other=[a for a in range(3) if a!=axis]
            corners=[]
            for u,v in [(-1,-1),(1,-1),(1,1),(-1,1)]:
                q=normal.copy();q[other[0]]=u;q[other[1]]=v;corners.append(q)
            if np.dot(np.cross(corners[1]-corners[0],corners[2]-corners[0]),normal)<0: corners.reverse()
            start=len(p);p.extend([q.tolist() for q in corners]);n.extend([normal.tolist()]*4)
            idx.extend([start,start+1,start+2,start,start+2,start+3])
    return p,n,idx

def export(name):
    data=bytearray();views=[];access=[];meshes=[];materials=[];cache={}
    def buffer(values,dtype,kind,component,bounds=False,target=None):
        array=np.array(values,dtype=dtype); offset=len(data); raw=array.tobytes();data.extend(raw)
        while len(data)%4:data.append(0)
        view={'buffer':0,'byteOffset':offset,'byteLength':len(raw)}
        if target:view['target']=target
        views.append(view)
        acc={'bufferView':len(views)-1,'componentType':component,'count':len(array),'type':kind}
        if bounds:acc.update(min=np.min(array,axis=0).reshape(-1).tolist(),max=np.max(array,axis=0).reshape(-1).tolist())
        access.append(acc);return len(access)-1
    geometry=[]
    for p,n,indices in [sphere(),cube()]:
        geometry.append((buffer(p,'<f4','VEC3',5126,True,34962),buffer(n,'<f4','VEC3',5126,False,34962),buffer(indices,'<u2','SCALAR',5123,False,34963)))
    nodes=[{'name':renderer.NAMES[name],'children':[]}]
    for i,(p,r,rot,col,gloss,box) in enumerate(renderer.model(name)):
        key=(box,tuple(col),gloss)
        if key not in cache:
            materials.append({'name':f'material-{len(materials)}','pbrMetallicRoughness':{'baseColorFactor':col.tolist()+[1],'metallicFactor':0.08,'roughnessFactor':max(.18,1-gloss)}})
            pos,norm,ind=geometry[int(box)]
            meshes.append({'primitives':[{'attributes':{'POSITION':pos,'NORMAL':norm},'indices':ind,'material':len(materials)-1}]})
            cache[key]=len(meshes)-1
        angle=math.atan2(rot[1,0],rot[0,0])
        nodes.append({'name':f'{name}-part-{i:02d}','mesh':cache[key],'translation':p.tolist(),'scale':r.tolist(),'rotation':[0,0,math.sin(angle/2),math.cos(angle/2)]})
        nodes[0]['children'].append(len(nodes)-1)
    animations=[]
    for clip,ys,angles in [('Idle',[0,.04,0],[0,0,0]),('Saludar',[0,.03,0],[-.04,.04,-.04]),('Pensar',[0,0,0],[0,-.1,-.1]),('Celebrar',[0,.18,0],[-.06,.06,-.06])]:
        time=buffer([0,1,2],'<f4','SCALAR',5126,True)
        translation=buffer([[0,y,0] for y in ys],'<f4','VEC3',5126)
        rotation=buffer([[0,0,math.sin(a/2),math.cos(a/2)] for a in angles],'<f4','VEC4',5126)
        animations.append({'name':clip,'samplers':[{'input':time,'output':translation,'interpolation':'LINEAR'},{'input':time,'output':rotation,'interpolation':'LINEAR'}],'channels':[{'sampler':0,'target':{'node':0,'path':'translation'}},{'sampler':1,'target':{'node':0,'path':'rotation'}}]})
    doc={'asset':{'version':'2.0','generator':'ONE KIDS procedural studio'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':nodes,'meshes':meshes,'materials':materials,'buffers':[{'byteLength':len(data)}],'bufferViews':views,'accessors':access,'animations':animations}
    js=json.dumps(doc,separators=(',',':')).encode();js+=b' '*((-len(js))%4)
    total=12+8+len(js)+8+len(data)
    blob=struct.pack('<III',0x46546c67,2,total)+struct.pack('<II',len(js),0x4E4F534A)+js+struct.pack('<II',len(data),0x004E4942)+data
    (OUT/f'{name}.glb').write_bytes(blob)
    print(name,len(blob),'bytes',flush=True)

if __name__=='__main__':
    for name in renderer.NAMES:export(name)
