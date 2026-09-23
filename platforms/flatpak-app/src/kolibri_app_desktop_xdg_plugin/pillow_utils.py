#!/usr/bin/env python
#
# Copyright 2021-2024 Endless OS Foundation, LLC
# SPDX-License-Identifier: MIT
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from PIL import Image
from PIL import ImageChops


def pil_formats_for_mimetype(mimetype):
    return [fmt for fmt, fmt_mime in Image.MIME.items() if fmt_mime == mimetype]


def center_xy(base_size, paste_size):
    if len(base_size) > 2 or len(paste_size) > 2:
        raise ValueError()
    x1, y1 = [int((a - b) / 2) for a, b in zip(base_size, paste_size)]
    return [x1, y1, x1 + paste_size[0], y1 + paste_size[1]]


def paste_center(base_image, paste_image, **kwargs):
    tmp = base_image.copy()
    tmp.paste(paste_image, center_xy(base_image.size, paste_image.size), **kwargs)
    base_image.alpha_composite(tmp)


def resize_preserving_aspect_ratio(source_image, target_size, **kwargs):
    source_size_square = (max(source_image.size),) * 2
    frame_image = Image.new("RGBA", source_size_square, (0, 0, 0, 0))
    paste_center(frame_image, source_image)
    return frame_image.resize(target_size, **kwargs)


def crop_image_to_square(image, cut_area):
    width, height = image.size
    short_edge = min(width, height)
    off_square = abs(1 - (width / height))

    if off_square == 0 or off_square > cut_area:
        return image

    return image.crop(center_xy(image.size, (short_edge,) * 2))


def image_is_square(image):
    if image.size[0] != image.size[1]:
        return False

    square = Image.new("L", image.size, (255,))
    diff = ImageChops.difference(image.getchannel("A"), square)

    return not diff.getbbox()
