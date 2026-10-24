#!/usr/bin/env python3
"""Lossless PNG recompression for icons/ (and icons/splash/): keeps every pixel identical, rewrites a file only when smaller.
Run after tools/make-icons.js / tools/make-splash.js (they call it): python3 tools/optimize-icons.py [folder]
A 256-colour palette would be ~70% smaller but bands the gradients and the card shadows, so it is not used."""
import io, os, sys
from PIL import Image, ImageChops

root = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'icons')
before = after = 0
for folder, _, files in sorted(os.walk(root)):
    for name in sorted(files):
        if not name.endswith('.png'):
            continue
        path = os.path.join(folder, name)
        old = os.path.getsize(path)
        im = Image.open(path); im.load()
        buf = io.BytesIO(); im.save(buf, 'PNG', optimize=True, compress_level=9)
        new = len(buf.getvalue())
        same = ImageChops.difference(im.convert('RGBA'), Image.open(io.BytesIO(buf.getvalue())).convert('RGBA')).getbbox() is None
        before += old
        if new < old and same:
            with open(path, 'wb') as f:
                f.write(buf.getvalue())
            after += new
        else:
            after += old
print(f'icons: {before:,} -> {after:,} bytes ({(1 - after / before) * 100:.1f}% smaller)')
