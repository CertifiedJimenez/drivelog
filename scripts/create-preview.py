"""Create the generic sharing artwork and icons without using test data."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets'
OUT.mkdir(exist_ok=True)
S = 2
im = Image.new('RGB', (1200*S, 630*S), '#f3f6f0')
d = ImageDraw.Draw(im)
def box(coords, fill, radius=0, outline=None, width=1):
    coords = tuple(int(x*S) for x in coords)
    if radius:
        d.rounded_rectangle(coords, radius=radius*S, fill=fill, outline=outline, width=width*S)
    else:
        d.rectangle(coords, fill=fill, outline=outline, width=width*S)
def text(x,y,value,size,color='#18382d',bold=False):
    font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf' if bold else '/System/Library/Fonts/Supplemental/Arial.ttf',size*S)
    d.text((x*S,y*S),value,font=font,fill=color)
def line(points,fill,width):
    d.line([(int(x*S),int(y*S)) for x,y in points],fill=fill,width=width*S,joint='curve')
box((0,0,1200,12),'#175e45')
box((62,54,110,102),'#175e45',12)
line([(74,78),(83,86),(99,68)],'#ffffff',4)
text(126,59,'DriveLog',31,bold=True)
text(62,173,'Driving Test',68,bold=True)
text(62,251,'Results',68,bold=True)
text(65,358,'Review every mark.',29,color='#62776a')
text(65,400,'See where it happened.',29,color='#62776a')
text(65,534,'FAULTS  /  TIMES  /  LOCATIONS',17,color='#175e45',bold=True)
box((768,68,1138,557),'#e3ecde',28)
box((799,100,1106,518),'#ffffff',18)
box((821,124,1083,167),'#eff4eb',8)
text(838,133,'TEST REPORT',16,color='#476b53',bold=True)
for y, color, width in [(201,'#a16a0b',143),(251,'#ba5116',123),(301,'#b52c39',156)]:
    d.ellipse((824*S,y*S,838*S,(y+14)*S),fill=color)
    box((852,y+1,852+width,y+7),'#d5dfd1',3)
    box((852,y+16,938,y+20),'#e7ece3',2)
box((821,356,1083,494),'#edf3e7',9)
line([(830,471),(896,411),(937,433),(1005,366)],'#ffffff',13)
line([(830,389),(889,411),(933,482),(1079,431)],'#ffffff',10)
d.ellipse((950*S,381*S,1002*S,433*S),fill='#175e45')
d.polygon([(961*S,423*S),(992*S,423*S),(977*S,447*S)],fill='#175e45')
d.ellipse((968*S,399*S,984*S,415*S),fill='#ffffff')
im.resize((1200,630),Image.Resampling.LANCZOS).save(OUT/'share-preview.png',optimize=True)
icon = Image.new('RGB',(360,360),'#175e45')
idraw=ImageDraw.Draw(icon)
idraw.line([(90,180),(151,238),(276,108)],fill='white',width=24,joint='curve')
icon.resize((180,180),Image.Resampling.LANCZOS).save(OUT/'apple-touch-icon.png',optimize=True)
icon.resize((32,32),Image.Resampling.LANCZOS).save(OUT/'favicon.png',optimize=True)
