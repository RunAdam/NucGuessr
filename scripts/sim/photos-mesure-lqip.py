import io, glob, base64
from PIL import Image, ImageFilter
fichiers = sorted(glob.glob(r"C:/Windows/Web/Wallpaper/Spotlight/*.jpg") + glob.glob(r"C:/Windows/Web/Wallpaper/Theme*/*.jpg") + glob.glob(r"C:/Windows/Web/Wallpaper/Windows/img19.jpg"))
def webp(im, q):
    b = io.BytesIO(); im.save(b, "WEBP", quality=q, method=6); return len(b.getvalue())
res = []
for f in fichiers:
    im = Image.open(f).convert("RGB")
    w, h = im.size
    # recadrage 3:2 paysage puis 1600 px
    im16 = im.resize((1600, round(1600*h/w)), Image.LANCZOS)
    s = {q: webp(im16, q) for q in (70, 75, 80, 85)}
    im4 = im.resize((400, round(400*h/w)), Image.LANCZOS).filter(ImageFilter.GaussianBlur(6))
    s400 = webp(im4, 40)
    im16px = im.resize((16, round(16*h/w)), Image.LANCZOS)
    b = io.BytesIO(); im16px.save(b, "WEBP", quality=40); lq = len(base64.b64encode(b.getvalue()))
    im8 = im.resize((800, round(800*h/w)), Image.LANCZOS); s800 = webp(im8, 80)
    res.append((f.split("/")[-1], w, h, s, s400, lq, s800))
    print(f.split("/")[-1][-12:], w, h, {k: v//1024 for k, v in s.items()}, "400flou", s400//1024, "KB  LQIP b64", lq, "o  800px", s800//1024)
import statistics as st
for q in (70, 75, 80, 85):
    v = [r[3][q] for r in res]; print("q", q, "médiane", st.median(v)//1024, "Ko min", min(v)//1024, "max", max(v)//1024)
print("400 flou médiane", st.median([r[4] for r in res])//1024, "Ko ; LQIP b64 médiane", st.median([r[5] for r in res]), "o ; 800px q80 médiane", st.median([r[6] for r in res])//1024)
