#!/usr/bin/env python3
"""Convert an 8-bit RGB/RGBA PNG into a Radiance RGBE .hdr file.

This is intentionally dependency-free so it can run from Unreal with a stock
Python install. It preserves the image as an HDRI-compatible container; it does
not invent real high dynamic range from an LDR source.
"""

from __future__ import annotations

import pathlib
import struct
import sys
import zlib


PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


def paeth(a: int, b: int, c: int) -> int:
    p = a + b - c
    pa = abs(p - a)
    pb = abs(p - b)
    pc = abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    if pb <= pc:
        return b
    return c


def read_png(path: pathlib.Path) -> tuple[int, int, bytes]:
    data = path.read_bytes()
    if not data.startswith(PNG_SIGNATURE):
        raise ValueError("Input is not a PNG file")

    offset = len(PNG_SIGNATURE)
    width = height = color_type = bit_depth = None
    idat = bytearray()

    while offset < len(data):
        length = struct.unpack(">I", data[offset : offset + 4])[0]
        chunk_type = data[offset + 4 : offset + 8]
        chunk_data = data[offset + 8 : offset + 8 + length]
        offset += 12 + length

        if chunk_type == b"IHDR":
            width, height, bit_depth, color_type, _compression, _filter, interlace = struct.unpack(">IIBBBBB", chunk_data)
            if bit_depth != 8:
                raise ValueError("Only 8-bit PNG files are supported")
            if color_type not in (2, 6):
                raise ValueError("Only RGB and RGBA PNG files are supported")
            if interlace != 0:
                raise ValueError("Interlaced PNG files are not supported")
        elif chunk_type == b"IDAT":
            idat.extend(chunk_data)
        elif chunk_type == b"IEND":
            break

    if width is None or height is None or color_type is None:
        raise ValueError("PNG is missing IHDR")

    channels = 4 if color_type == 6 else 3
    stride = width * channels
    raw = zlib.decompress(bytes(idat))
    expected_size = height * (stride + 1)
    if len(raw) != expected_size:
        raise ValueError(f"Unexpected PNG data size: expected {expected_size}, got {len(raw)}")
    rows: list[bytes] = []
    previous = bytearray(stride)
    index = 0

    for _y in range(height):
        filter_type = raw[index]
        index += 1
        scanline = bytearray(raw[index : index + stride])
        index += stride

        for x in range(stride):
            left = scanline[x - channels] if x >= channels else 0
            up = previous[x]
            up_left = previous[x - channels] if x >= channels else 0

            if filter_type == 1:
                scanline[x] = (scanline[x] + left) & 0xFF
            elif filter_type == 2:
                scanline[x] = (scanline[x] + up) & 0xFF
            elif filter_type == 3:
                scanline[x] = (scanline[x] + ((left + up) // 2)) & 0xFF
            elif filter_type == 4:
                scanline[x] = (scanline[x] + paeth(left, up, up_left)) & 0xFF
            elif filter_type != 0:
                raise ValueError(f"Unsupported PNG filter type: {filter_type}")

        rgb = bytearray(width * 3)
        for pixel in range(width):
            source = pixel * channels
            target = pixel * 3
            rgb[target : target + 3] = scanline[source : source + 3]
        rows.append(bytes(rgb))
        previous = scanline

    return width, height, b"".join(rows)


def encode_hdr(width: int, height: int, rgb: bytes) -> bytes:
    if len(rgb) != width * height * 3:
        raise ValueError(f"Unexpected RGB data size: expected {width * height * 3}, got {len(rgb)}")

    encoded = bytearray()
    encoded.extend(b"#?RADIANCE\n")
    encoded.extend(b"FORMAT=32-bit_rle_rgbe\n\n")
    encoded.extend(f"-Y {height} +X {width}\n".encode("ascii"))

    for y in range(height):
        row = rgb[y * width * 3 : (y + 1) * width * 3]
        encoded.extend(bytes([2, 2, (width >> 8) & 0xFF, width & 0xFF]))
        channels = [
            bytearray(width),
            bytearray(width),
            bytearray(width),
            bytearray([128] * width),
        ]
        for x in range(width):
            channels[0][x] = row[x * 3]
            channels[1][x] = row[x * 3 + 1]
            channels[2][x] = row[x * 3 + 2]

        for channel in channels:
            cursor = 0
            while cursor < width:
                run_end = cursor + 1
                while run_end < width and run_end - cursor < 127 and channel[run_end] == channel[cursor]:
                    run_end += 1
                if run_end - cursor >= 4:
                    encoded.extend(bytes([128 + run_end - cursor, channel[cursor]]))
                    cursor = run_end
                else:
                    literal_start = cursor
                    cursor += 1
                    while cursor < width:
                        lookahead_end = cursor + 1
                        while lookahead_end < width and lookahead_end - cursor < 127 and channel[lookahead_end] == channel[cursor]:
                            lookahead_end += 1
                        if lookahead_end - cursor >= 4 or cursor - literal_start >= 127:
                            break
                        cursor += 1
                    encoded.extend(bytes([cursor - literal_start]))
                    encoded.extend(channel[literal_start:cursor])

    return bytes(encoded)


def write_hdr(path: pathlib.Path, width: int, height: int, rgb: bytes) -> None:
    encoded = encode_hdr(width, height, rgb)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(encoded)


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: png_to_hdr.py input.png output.hdr", file=sys.stderr)
        return 2

    input_path = pathlib.Path(sys.argv[1])
    output_path = pathlib.Path(sys.argv[2])
    width, height, rgb = read_png(input_path)
    write_hdr(output_path, width, height, rgb)
    print(f"Wrote {output_path} ({width}x{height})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
