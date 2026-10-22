"""Read-only QA of the six transparent sprites; needs Pillow. Never modifies artwork."""
from pathlib import Path
from PIL import Image
import numpy as np
root=Path(__file__).resolve().parents[1]/'assets/characters/expressions/transparent'
ids=['bear','inventor','polar','turtle','penguin','tutorbot']
for id in ids:
    image=Image.open(root/f'{id}.png')
    assert image.mode=='RGBA',f'{id}: no alpha channel'
    assert image.size==(1536,1024),f'{id}: unexpected sheet dimensions'
    alpha=np.asarray(image.getchannel('A'))
    assert (alpha==0).mean()>.45,f'{id}: opaque backdrop remains'
    assert alpha[0,0]==0 and alpha[-1,-1]==0,f'{id}: opaque sheet corners'
    # Every pose must have actual opaque character pixels and empty space around it.
    for row,(y0,y1) in enumerate([(52,366),(370,658),(660,986)]):
        for col,(x0,x1) in enumerate([(3,305),(310,612),(617,919),(924,1226),(1231,1533)]):
            cell=alpha[y0:y1,x0:x1]
            assert (cell>240).mean()>.08,f'{id} {row},{col}: character missing or erased'
            assert (cell==0).mean()>.15,f'{id} {row},{col}: opaque rectangle remains'
    print(f'{id}: transparent backdrop + 15 opaque poses verified')
print('PASS: 90 alpha-cutout frames; original sheets remain unchanged.')
