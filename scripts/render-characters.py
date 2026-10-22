"""Offline 3D studio renderer for ONE KIDS, following ONE ASSISTANT's render pipeline.
Analytic ellipsoids and cuboids, three lights, ray-traced shadows. No runtime 3D engine.
Requires NumPy and Pillow. Outputs transparent 512px WebP assets + contact sheet.
"""
from pathlib import Path
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont

OUT = Path(__file__).resolve().parents[1] / 'assets/characters'
OUT.mkdir(parents=True, exist_ok=True)
NAMES = {'kiko':'Kiko', 'nova':'Nova', 'axon':'Axon', 'lumi':'Lumi', 'miko':'Miko', 'orbit':'Orbit', 'bear':'Oso explorador', 'inventor':'Oso inventor', 'polar':'Oso polar', 'turtle':'Tortuga sabia', 'penguin':'Pingüino curioso', 'tutorbot':'Robot tutor'}

def unit(v):
    return v / np.maximum(np.linalg.norm(v, axis=-1, keepdims=True), 1e-10)

def model(name):
    objects=[]
    def shape(p,r,c,angle=0,box=False,gloss=.35):
        a=math.radians(angle)
        rot=np.array([[math.cos(a),-math.sin(a),0],[math.sin(a),math.cos(a),0],[0,0,1.]])
        col=(np.array([int(c[i:i+2],16) for i in (1,3,5)])/255)**2.2
        objects.append((np.array(p), np.array(r), rot, col, gloss, box))
    def ball(p,r,c,angle=0,gloss=.35): shape(p,r,c,angle,False,gloss)
    def box(p,r,c,angle=0,gloss=.3): shape(p,r,c,angle,True,gloss)
    def eyes(y=2.25,z=.64,spread=.26,size=.14,cyan=False):
        for x in [-spread,spread]:
            ball((x,y,z),(size*1.4,size*1.7,.09),'#FFFFFF',gloss=.6)
            ball((x+.025,y,z+.08),(size*.82,size*1.15,.045),'#70E9E9' if cyan else '#172639',gloss=.9)
            ball((x-.02,y+.065,z+.12),(.032,.044,.015),'#FFFFFF',gloss=.9)
    def smile(y,z,w=.15):
        for x in np.linspace(-w,w,9): ball((x,y+1.5*x*x,z),(.025,.025,.022),'#27354B',gloss=.1)
    def book(x=-.62,y=1.0,c='#317FAD'):
        box((x,y,.72),(.3,.35,.07),c,-12)
        box((x,y,.8),(.25,.29,.025),'#F8F0D7',-12)
        for yy in [-.14,-.04,.06]: box((x,y+yy,.832),(.17,.009,.008),'#90B4B5',-12)
    # Original rounded companions, modeled from the first reference board.
    if name in ('kiko','orbit'):
        c='#4ACBD2' if name=='kiko' else '#E0E9F5'
        ball((0,1.12,0),(.54,.72,.42),c,gloss=.55)
        ball((0,2.24,0),(.85,.76,.65),c,gloss=.55)
        ball((0,2.25,.51),(.69,.51,.2),'#102A41',gloss=.8)
        for x in [-.27,.27]: ball((x,2.28,.704),(.105,.16,.025),'#87FFFF',gloss=.8)
        smile(2.04,.711)
        ball((0,1.22,.41),(.24,.24,.08),'#F2F7FA',gloss=.7)
        ball((0,1.22,.49),(.14,.14,.035),'#2FCBDF',gloss=.8)
        if name=='kiko':
            box((0,3.02,0),(.025,.19,.025),'#29485A')
            ball((0,3.22,0),(.13,.13,.13),'#5CE6E9',gloss=.8)
            for x in [-1,1]:
                ball((x*.4,.39,.04),(.25,.24,.32),c,gloss=.5)
                ball((x*.68,1.24,.03),(.19,.36,.19),c,x*-20,gloss=.5)
                ball((x*.73,2.26,.06),(.16,.32,.29),'#E7EAF0',gloss=.5)
                box((x*.35,1.55,.34),(.055,.35,.06),'#D59A47',x*10)
            ball((-.79,1.68,.06),(.17,.25,.15),c,-30)
        else:
            for x in [-1,1]:
                # Orbital ring assembled from reflective beads, genuinely three-dimensional.
                for a in np.linspace(0,math.tau,26,endpoint=False):
                    ball((x*.98+.27*math.cos(a),2.3+.37*math.sin(a),0),(.045,.045,.07),'#5EA2FF',gloss=.8)
                ball((x*.61,1.05,.13),(.13,.25,.13),c,x*25)
            ball((0,.61,0),(.25,.18,.2),'#557DF5',gloss=.8)
            book(-.61,.98,'#55CBE9')
    elif name in ('nova','miko','axon'):
        c={'nova':'#A789DF','miko':'#F39358','axon':'#243D63'}[name]
        light={'nova':'#E7C6F3','miko':'#FFE0AD','axon':'#BDDEE4'}[name]
        ball((0,1.1,0),(.47,.66,.33),c)
        ball((0,2.23,0),(.73,.65,.55),c)
        ball((0,1.98,.45),(.36,.22,.22),light)
        ball((0,2.05,.64),(.075,.05,.045),'#263848')
        eyes(2.32,.49,.28,.14)
        smile(1.88,.64,.13)
        for x in [-1,1]:
            ball((x*.28,.42,.13),(.21,.27,.29),c)
            ball((x*.55,1.17,.02),(.16,.37,.16),c,-x*24)
        # Curved tapered tail made of increasingly fine segments.
        for i,t in enumerate(np.linspace(0,1,12)):
            ball((.35+t*.82,.85+math.sin(t*2.7)*.5,-.38-t*.25),(.24*(1-t)+.08,.22*(1-t)+.08,.22*(1-t)+.07),light if i>8 else c)
        if name=='nova':
            for x in [-1,1]:
                for i,(dx,dy) in enumerate([(.54,2.76),(.77,2.5),(.8,2.2)]):
                    ball((x*dx,dy,-.03),(.19,.37,.1),'#D2A1E8',x*(-35-i*25))
                    ball((x*(dx+.01),dy+.04,.06),(.075,.18,.035),'#FFB7CB',x*(-35-i*25))
            box((0,1.05,.33),(.45,.09,.06),'#76533F')
            for x in [-.3,.27]: box((x,1.05,.43),(.13,.15,.06),'#CCA460')
            ball((-.85,1.5,.15),(.23,.23,.23),'#FFD66D',gloss=.85)
        elif name=='miko':
            for x in [-1,1]:
                ball((x*.57,2.65,-.02),(.15,.3,.12),'#4EAE9A',-x*30)
                ball((x*.62,1.48,-.25),(.35,.4,.1),'#E67F66',x*30)
                ball((x*.7,1.52,-.13),(.22,.28,.025),'#F8B6A3',x*30)
            box((0,1.7,.27),(.42,.1,.1),'#3D9482',-6)
            book(-.57,1.0,'#C6AB73')
        else:
            for x in [-1,1]:
                ball((x*.5,2.83,-.08),(.21,.5,.13),c,-x*20)
                ball((x*.5,2.91,.04),(.1,.29,.04),'#5EDBC9',-x*20)
                ball((x*.25,.32,.2),(.23,.15,.33),'#15243A')
                box((x*.25,.25,.25),(.21,.035,.25),'#59CBBE')
            ball((0,1.18,.06),(.51,.48,.36),'#263449')
            box((0,1.22,.43),(.07,.4,.03),'#6AEBD7')
            for x in [-1,1]: box((x*.27,1.55,.32),(.17,.07,.07),'#6AEBD7',x*25)
    elif name=='lumi':
        ball((0,1.2,0),(.61,.75,.39),'#DFAB49')
        ball((0,2.21,0),(.78,.64,.55),'#F1BF65')
        for x in [-1,1]:
            ball((x*.36,2.25,.4),(.37,.41,.17),'#FFF1CF')
            ball((x*.36,2.25,.56),(.29,.32,.05),'#5D513E',gloss=.7)
            ball((x*.36,2.25,.61),(.25,.28,.045),'#FFF7E7')
            ball((x*.36,2.25,.66),(.15,.21,.04),'#573B1F',gloss=.9)
            ball((x*.36-.04,2.32,.7),(.05,.07,.018),'#FFFFFF',gloss=.9)
            ball((x*.55,2.71,-.01),(.14,.29,.14),'#D19C41',-x*30)
            ball((x*.68,1.24,.02),(.22,.43,.16),'#EABC5B',-x*25)
            for i in [-1,0,1]: ball((x*.26+i*.08,.32,.22),(.055,.12,.2),'#BD8538')
        ball((0,2.1,.66),(.1,.15,.09),'#DA8E2E')
        box((0,1.67,.22),(.48,.12,.15),'#5FBCAC',-5)
        ball((.35,1.42,.39),(.12,.32,.07),'#61BCA9',-15)
        book(-.3,1.05,'#3F8878')
    else:
        # Second family retains the exact cuboid visual language of the reference.
        c={'bear':'#AF682E','inventor':'#8750B0','polar':'#F1ECD9','turtle':'#65B73C','penguin':'#24466F','tutorbot':'#EFEDD9'}[name]
        belly={'bear':'#F3D18C','inventor':'#C39BD7','polar':'#A4D5E0','turtle':'#EFE0B5','penguin':'#F6EDD6','tutorbot':'#4CC4A4'}[name]
        box((0,2.35,0),(.62,.57,.43),c)
        box((0,1.12,0),(.4,.59,.28),c)
        box((0,1.13,.29),(.25,.48,.035),belly)
        for x in [-1,1]:
            box((x*.24,.35,.03),(.13,.2,.17),c)
            box((x*.24,.19,.16),(.18,.08,.29),'#F3AB38' if name=='penguin' else c)
            box((x*.55,1.22,.02),(.12,.36,.15),c,-x*18)
        if name in ('bear','inventor','polar'):
            for x in [-1,1]:
                box((x*.47,2.98,-.03),(.15,.16,.12),c)
                box((x*.47,2.99,.1),(.085,.09,.025),belly)
            box((0,2.12,.48),(.26,.19,.075),belly)
            box((0,2.18,.56),(.065,.04,.025),'#26333B')
        elif name=='turtle':
            ball((0,1.18,-.16),(.58,.69,.36),'#795236')
            ball((0,1.2,.2),(.45,.61,.18),belly)
            for y in [.85,1.12,1.4]: box((0,y,.379),(.39,.024,.015),'#926D45')
            box((0,2.12,.47),(.28,.13,.07),'#57A32B')
            book(-.63,1.12,'#387F6F')
        elif name=='penguin':
            box((0,2.12,.53),(.17,.09,.17),'#F2A437',45)
            for x in [-1,1]: box((x*.25,2.7,.46),(.16,.04,.03),'#172F50',x*-14)
            book(-.55,1.17,'#254C89')
        else:
            box((0,2.35,.45),(.48,.43,.035),'#2CA587')
            box((0,1.1,.32),(.25,.38,.035),'#41B897')
        for x in [-1,1]:
            box((x*.24,2.43,.477 if name!='tutorbot' else .52),(.038,.09,.025),'#102735')
        if name=='bear':
            for x in [-1,1]: box((x*.3,1.39,.33),(.035,.35,.04),'#45B9DE',x*-5)
            # Yellow shoulder companion.
            box((-.75,1.94,.04),(.15,.15,.13),'#FFE04E')
            box((-.75,1.62,.04),(.11,.16,.09),'#EBC52D')
            for x in [-.81,-.69]: box((x,1.96,.18),(.018,.032,.01),'#293441')
        elif name=='inventor':
            box((0,2.88,.4),(.56,.06,.045),'#25364F')
            for x in [-1,1]:
                box((x*.27,2.9,.46),(.21,.15,.05),'#42BCD7')
                box((x*.27,2.9,.52),(.14,.085,.02),'#276481',gloss=.7)
            box((-.68,1.2,.36),(.22,.27,.14),'#A6BBC7',-10)
            for i,col in enumerate(['#ED7955','#61C783','#E8C548']): box((-.8+i*.12,1.25,.53),(.035,.045,.02),col)
        elif name=='polar': book(-.62,1.12,'#408DC2')
        elif name=='tutorbot':
            for x in [-1,1]: ball((x*.23,2.42,.545),(.06,.07,.02),'#B8FFF1',gloss=.8)
            smile(2.12,.51)
    return objects

def intersect(o,d,obj):
    p,r,rot,_,_,box=obj
    q=(o-p)@rot; v=d@rot
    if box:
        safe=np.where(abs(v)<1e-9,1e-9,v)
        t1=(-r-q)/safe; t2=(r-q)/safe
        near=np.max(np.minimum(t1,t2),axis=-1); far=np.min(np.maximum(t1,t2),axis=-1)
        return np.where((near<=far)&(near>1e-4),near,np.inf)
    q=q/r; v=v/r
    a=np.sum(v*v,axis=-1); b=np.sum(q*v,axis=-1); c=np.sum(q*q,axis=-1)-1
    disc=b*b-a*c
    t=(-b-np.sqrt(np.maximum(disc,0)))/a
    return np.where((disc>=0)&(t>1e-4),t,np.inf)

def render(name,size=512):
    obs=model(name)
    eye=np.array([3.0,3.3,10.]); target=np.array([0,1.7,0])
    forward=unit(target-eye); right=unit(np.cross(forward,[0,1,0])); up=np.cross(right,forward)
    yy,xx=np.mgrid[:size,:size]
    origin=eye+((xx+.5)/size-.5)[...,None]*4.0*right+(.5-(yy+.5)/size)[...,None]*4.0*up
    rays=np.broadcast_to(forward,origin.shape)
    depth=np.full((size,size),np.inf); ids=np.full((size,size),-1)
    for i,obj in enumerate(obs):
        t=intersect(origin,rays,obj); mask=t<depth; depth[mask]=t[mask]; ids[mask]=i
    hit=ids>=0; pts=origin[hit]+rays[hit]*depth[hit,None]
    n=np.zeros_like(pts); base=np.zeros_like(pts); gloss=np.zeros(len(pts))
    for i,(p,r,rot,c,g,box) in enumerate(obs):
        mask=ids[hit]==i; q=(pts[mask]-p)@rot
        if box:
            axis=np.argmax(abs(q/r),axis=-1); normal=np.zeros_like(q)
            normal[np.arange(len(q)),axis]=np.sign(q[np.arange(len(q)),axis]); n[mask]=normal@rot.T
        else: n[mask]=unit(q/(r*r)@rot.T)
        base[mask]=c; gloss[mask]=g
    illum=np.full_like(pts,.22)+np.maximum(n[:,1,None],0)*.16; spec=np.zeros_like(pts)
    for pos,power,tint in [((-3.5,6,5),1.4,np.array([1.,.93,.84])),((4,3,2),.65,np.array([.67,.84,1.])),((1,5,-4),1.1,np.array([.83,.92,1.]))]:
        delta=np.array(pos)-pts; dist=np.linalg.norm(delta,axis=-1); ld=unit(delta)
        vis=np.ones(len(pts))
        for obj in obs: vis[intersect(pts+n*.004,ld,obj)<dist]=.12
        nl=np.maximum(np.sum(n*ld,axis=-1),0)
        illum+=nl[:,None]*vis[:,None]*power*tint
        half=unit(ld-forward); shine=np.maximum(np.sum(n*half,axis=-1),0)**(25+gloss*90)
        spec+=shine[:,None]*vis[:,None]*power*tint*(.1+gloss[:,None]*.5)
    rgb=np.clip(base*illum+spec,0,1)**(1/2.2)
    rgba=np.zeros((size,size,4),dtype=np.uint8)
    sx=(xx-size*.5)/(size*.19); sy=(yy-size*.904)/(size*.025)
    rgba[:,:,3]=(np.exp(-2*(sx*sx+sy*sy))*52).astype('uint8')
    rgba[hit,:3]=(rgb*255).astype('uint8'); rgba[hit,3]=255
    im=Image.fromarray(rgba)
    im.save(OUT/f'{name}.webp',quality=90,method=6)
    print(name,(OUT/f'{name}.webp').stat().st_size,flush=True)
    return im

if __name__=='__main__':
    import sys
    names=sys.argv[1:] or list(NAMES)
    for name in names: render(name)
    if all((OUT/f'{name}.webp').exists() for name in NAMES):
        sheet=Image.new('RGB',(1600,1200),'#F2F5FC'); draw=ImageDraw.Draw(sheet)
        fontpath='/System/Library/Fonts/Supplemental/Arial.ttf'
        font=ImageFont.truetype(fontpath,24)
        for i,name in enumerate(NAMES):
            x=(i%4)*400; y=(i//4)*400
            im=Image.open(OUT/f'{name}.webp').convert('RGBA').resize((340,340),Image.Resampling.LANCZOS)
            sheet.paste(im,(x+30,y+8),im)
            draw.text((x+200,y+365),NAMES[name],fill='#243754',font=font,anchor='mm')
        sheet.save(OUT/'collection-preview.jpg',quality=92)
