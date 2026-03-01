from PIL import Image, ImageDraw
import os

os.makedirs('/Users/clemon/Documents/28/codeb/src-tauri/icons', exist_ok=True)

for size in [32, 128, 256]:
    img = Image.new('RGBA', (size, size), (76, 175, 80, 255))
    draw = ImageDraw.Draw(img)
    margin = size // 4
    draw.rectangle([margin, margin, size-margin, margin*2], fill='white')
    draw.rectangle([margin, margin, margin*2, size-margin], fill='white')
    draw.rectangle([margin, int(margin*2.5), int(size-margin*1.5), margin*3], fill='white')
    
    if size == 32:
        img.save('/Users/clemon/Documents/28/codeb/src-tauri/icons/32x32.png')
    elif size == 128:
        img.save('/Users/clemon/Documents/28/codeb/src-tauri/icons/128x128.png')
        img.save('/Users/clemon/Documents/28/codeb/src-tauri/icons/128x128@2x.png')

img = Image.new('RGBA', (256, 256), (76, 175, 80, 255))
draw = ImageDraw.Draw(img)
draw.rectangle([64, 64, 192, 128], fill='white')
draw.rectangle([64, 64, 128, 192], fill='white')
draw.rectangle([64, 160, 160, 192], fill='white')
img.save('/Users/clemon/Documents/28/codeb/src-tauri/icons/icon.ico')
img.save('/Users/clemon/Documents/28/codeb/src-tauri/icons/icon.icns')

print('Icons created')
