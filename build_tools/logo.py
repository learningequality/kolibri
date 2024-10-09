import argparse
import os
import tempfile

import cairosvg
from PIL import Image


# The default input size is based off the current size of the Kolibri logo SVG
def convert_svg_to_image(
    svg_file_path, output_file_path, input_size=200, final_size=None, padding=None
):
    ext = os.path.splitext(output_file_path)[1].lower()
    temp_png_file = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
    # Scale up, but don't scale down, as we don't want to lose quality
    cairosvg.svg2png(
        url=svg_file_path,
        write_to=temp_png_file.name,
        scale=final_size / input_size
        if final_size and final_size > input_size
        else 1.0,
    )

    with Image.open(temp_png_file.name) as img:
        # Convert image to RGBA if not already in that mode
        if img.mode != "RGBA":
            img = img.convert("RGBA")

        # Get the bounding box
        bbox = img.getbbox()

        # Crop the image to the contents
        img_cropped = img.crop(bbox)

        # Determine the dimensions for a square based on the cropped image
        max_dim = max(img_cropped.size)

        if padding:
            padding = int(padding) / 100
            max_dim += int(max_dim * padding)

        square_size = (max_dim, max_dim)

        # Create a new square image with a transparent background
        square_img = Image.new("RGBA", square_size, (0, 0, 0, 0))

        # Calculate top-left corner coordinates to paste the cropped image centered in the square canvas
        paste_position = (
            (max_dim - img_cropped.width) // 2,
            (max_dim - img_cropped.height) // 2,
        )
        square_img.paste(img_cropped, paste_position)

        if final_size:
            # If a final size is specified, resize the square image to these dimensions
            square_img = square_img.resize((final_size, final_size), Image.LANCZOS)

        # Remove the dot from the extension and convert to uppercase
        output_format = ext[1:].upper()

        if output_format == "JPG":
            output_format = "JPEG"  # Adjust for JPEG

        # Convert RGBA to RGB for JPEG, as JPEG does not support transparency
        if output_format == "JPEG":
            square_img = square_img.convert("RGB")

        # Save the final result
        square_img.save(output_file_path, format=output_format)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Convert SVG to cropped and optionally resized image file - will infer the type from the extension."
    )
    parser.add_argument("svg_file", help="Path to the input SVG file.")
    parser.add_argument("image_file", help="Path to the output file.")
    parser.add_argument(
        "--size",
        type=int,
        help="Optional final size to resize the output image to a square of this size.",
        default=None,
    )
    parser.add_argument(
        "--padding",
        type=int,
        help="Optional add this percentage of padding around the bounding box.",
        default=None,
    )

    args = parser.parse_args()

    convert_svg_to_image(
        args.svg_file, args.image_file, final_size=args.size, padding=args.padding
    )
