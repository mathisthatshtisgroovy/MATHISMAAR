# © Mathis Dabbarh Marsepoil. All rights reserved. See LICENSE.
"""Write Mathis Dabbarh Marsepoil's copyright into image files.

  python tools/stamp_copyright.py                  every image the site uses: downloads
                                                   them from the CDN and writes stamped
                                                   copies to copyright-images/ for upload
  python tools/stamp_copyright.py a.webp b.png     stamps those local files in place

Only the metadata changes. The image data is never re-encoded, and every file is
checked to decode pixel-for-pixel identical before it's written. Old camera,
editing and Adobe metadata is removed; colour profiles are kept.
"""
import collections
import datetime
import hashlib
import io
import json
import os
import struct
import subprocess
import sys
import urllib.parse
import urllib.request
import zlib

from PIL import Image

OWNER = "Mathis Dabbarh Marsepoil"
YEAR = datetime.date.today().year
EXIF_COPY = f"Copyright (c) {YEAR} {OWNER}. All rights reserved."   # EXIF text must be plain ASCII
XMP_COPY = f"© {YEAR} {OWNER}. All rights reserved."
CDN = "https://mathismaar.b-cdn.net/"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "copyright-images")

XMP = (
    '<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>\n'
    '<x:xmpmeta xmlns:x="adobe:ns:meta/">\n'
    ' <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n'
    '  <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/"'
    ' xmlns:xmpRights="http://ns.adobe.com/xap/1.0/rights/">\n'
    f'   <dc:creator><rdf:Seq><rdf:li>{OWNER}</rdf:li></rdf:Seq></dc:creator>\n'
    f'   <dc:rights><rdf:Alt><rdf:li xml:lang="x-default">{XMP_COPY}</rdf:li></rdf:Alt></dc:rights>\n'
    '   <xmpRights:Marked>True</xmpRights:Marked>\n'
    '  </rdf:Description>\n'
    ' </rdf:RDF>\n'
    '</x:xmpmeta>\n'
    '<?xpacket end="w"?>'
).encode("utf-8")


def exif_tiff():
    """A minimal little-endian TIFF block: Artist (0x013B) and Copyright (0x8298)."""
    entries = sorted([
        (0x013B, OWNER.encode("ascii") + b"\0"),
        (0x8298, EXIF_COPY.encode("ascii") + b"\0"),
    ])
    data_start = 8 + 2 + 12 * len(entries) + 4
    ifd, blob = struct.pack("<H", len(entries)), b""
    for tag, value in entries:
        ifd += struct.pack("<HHII", tag, 2, len(value), data_start + len(blob))
        blob += value + (b"\0" if len(value) % 2 else b"")
    return b"II*\x00" + struct.pack("<I", 8) + ifd + struct.pack("<I", 0) + blob


IMAGE_CHUNKS = {b"ICCP", b"ANIM", b"ANMF", b"ALPH", b"VP8 ", b"VP8L"}


def stamp_webp(data):
    if data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        raise ValueError("not a webp file")
    chunks, i = [], 12
    while i + 8 <= len(data):
        tag, size = data[i:i + 4], struct.unpack("<I", data[i + 4:i + 8])[0]
        chunks.append((tag, data[i + 8:i + 8 + size]))
        i += 8 + size + (size & 1)
    vp8x = next((p for t, p in chunks if t == b"VP8X"), None)
    keep = [(t, p) for t, p in chunks if t in IMAGE_CHUNKS]
    removed = [t.decode("latin1").strip() for t, _ in chunks if t not in IMAGE_CHUNKS and t != b"VP8X"]
    alpha = any(t == b"ALPH" for t, _ in keep)
    if vp8x:
        width = 1 + int.from_bytes(vp8x[4:7], "little")
        height = 1 + int.from_bytes(vp8x[7:10], "little")
        alpha = alpha or bool(vp8x[0] & 0x10)
    else:
        tag, payload = keep[0]
        if tag == b"VP8 ":
            width = struct.unpack("<H", payload[6:8])[0] & 0x3FFF
            height = struct.unpack("<H", payload[8:10])[0] & 0x3FFF
        else:
            bits = struct.unpack("<I", payload[1:5])[0]
            width, height = (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
            alpha = bool((bits >> 28) & 1)
    flags = 0x08 | 0x04  # EXIF and XMP present
    if any(t == b"ICCP" for t, _ in keep):
        flags |= 0x20
    if alpha:
        flags |= 0x10
    if any(t == b"ANIM" for t, _ in keep):
        flags |= 0x02
    header = bytes([flags, 0, 0, 0]) + (width - 1).to_bytes(3, "little") + (height - 1).to_bytes(3, "little")
    out = [(b"VP8X", header)] + keep + [(b"EXIF", exif_tiff()), (b"XMP ", XMP)]
    body = b"".join(t + struct.pack("<I", len(p)) + p + (b"\0" if len(p) & 1 else b"") for t, p in out)
    return b"RIFF" + struct.pack("<I", 4 + len(body)) + b"WEBP" + body, removed


def stamp_jpeg(data):
    if data[:2] != b"\xff\xd8":
        raise ValueError("not a jpeg file")
    segments, i = [], 2
    while i < len(data):
        if data[i] != 0xFF:
            raise ValueError("unexpected jpeg structure")
        marker = data[i + 1]
        if marker == 0xFF:
            i += 1
            continue
        if marker == 0xDA:  # start of scan: the rest is image data
            segments.append((marker, data[i:]))
            break
        if marker == 0x01 or 0xD0 <= marker <= 0xD7:
            segments.append((marker, data[i:i + 2]))
            i += 2
            continue
        length = struct.unpack(">H", data[i + 2:i + 4])[0]
        segments.append((marker, data[i:i + 2 + length]))
        i += 2 + length
    drop = {0xE1, 0xED, 0xFE}  # EXIF/XMP, Photoshop/IPTC, comments. ICC (APP2) is kept.
    removed = [f"jpeg-{hex(m)}" for m, _ in segments if m in drop]
    keep = [(m, s) for m, s in segments if m not in drop]
    exif = b"Exif\x00\x00" + exif_tiff()
    xmp = b"http://ns.adobe.com/xap/1.0/\x00" + XMP
    new = [b"\xff\xe1" + struct.pack(">H", 2 + len(exif)) + exif,
           b"\xff\xe1" + struct.pack(">H", 2 + len(xmp)) + xmp]
    at = 1 if keep and keep[0][0] == 0xE0 else 0  # after the JFIF header if there is one
    return b"\xff\xd8" + b"".join([s for _, s in keep[:at]] + new + [s for _, s in keep[at:]]), removed


def stamp_png(data):
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise ValueError("not a png file")
    chunks, i = [], 8
    while i < len(data):
        length = struct.unpack(">I", data[i:i + 4])[0]
        tag = data[i + 4:i + 8]
        chunks.append((tag, data[i + 8:i + 8 + length]))
        i += 12 + length
        if tag == b"IEND":
            break
    drop = {b"tEXt", b"iTXt", b"zTXt", b"eXIf", b"tIME", b"caBX"}
    removed = [f"png-{t.decode()}" for t, _ in chunks if t in drop]
    keep = [(t, p) for t, p in chunks if t not in drop]

    def chunk(tag, payload):
        return struct.pack(">I", len(payload)) + tag + payload + struct.pack(">I", zlib.crc32(tag + payload) & 0xFFFFFFFF)

    out, inserted = [], False
    for tag, payload in keep:
        if tag == b"IDAT" and not inserted:
            out += [(b"eXIf", exif_tiff()), (b"iTXt", b"XML:com.adobe.xmp\x00\x00\x00\x00\x00" + XMP)]
            inserted = True
        out.append((tag, payload))
    return data[:8] + b"".join(chunk(t, p) for t, p in out), removed


def stamper_for(data):
    # chosen by the file's contents, not its extension — some files on the CDN
    # are PNGs saved with a .webp name
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return stamp_webp
    if data[:2] == b"\xff\xd8":
        return stamp_jpeg
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return stamp_png
    return None


def pixels(data):
    img = Image.open(io.BytesIO(data))
    img.load()
    return img.size, img.mode, hashlib.md5(img.tobytes()).hexdigest()


def stamp(data, name):
    fn = stamper_for(data)
    if fn is None:
        raise ValueError(f"{name}: not a WebP, JPEG or PNG image")
    new, removed = fn(data)
    if pixels(data) != pixels(new):
        raise ValueError("image data changed — not written")
    exif = Image.open(io.BytesIO(new)).getexif()
    if exif.get(0x8298) != EXIF_COPY or exif.get(0x013B) != OWNER:
        raise ValueError("copyright not readable after stamping — not written")
    return new, removed


def write(path, data):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path + ".tmp", "wb") as f:
        f.write(data)
    os.replace(path + ".tmp", path)


def main(args):
    stats, problems, total = collections.Counter(), [], 0
    if args:
        for path in args:
            try:
                new, removed = stamp(open(path, "rb").read(), path)
                write(path, new)
                stats["stamped in place"] += 1
                for r in removed:
                    stats["removed " + r] += 1
            except Exception as e:
                problems.append(f"{path}: {e}")
    else:
        listed = subprocess.run(["node", os.path.join(ROOT, "tools", "list_site_images.js")],
                                capture_output=True, text=True, check=True)
        for rel in json.loads(listed.stdout):
            try:
                req = urllib.request.Request(CDN + urllib.parse.quote(rel), headers={"User-Agent": "mm-copyright"})
                new, removed = stamp(urllib.request.urlopen(req, timeout=180).read(), rel)
                write(os.path.join(OUT, rel), new)
                total += len(new)
                stats["stamped copies"] += 1
                for r in removed:
                    stats["removed " + r] += 1
            except Exception as e:
                problems.append(f"{rel}: {e}")
        print(f"copies written to {OUT} ({total / 1048576:.1f} MB) — upload them to Cloudflare, same paths")
    print(dict(stats))
    print("problems:", problems or "none")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
