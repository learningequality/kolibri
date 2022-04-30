import logging
import os

from django.core.management.base import BaseCommand
from django.template.loader import render_to_string
from django.utils.translation import override

from kolibri.utils.i18n import KOLIBRI_SUPPORTED_LANGUAGES


logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Create loading pages in all supported languages"

    def add_arguments(self, parser):
        parser.add_argument(
            "--output-dir",
            action="store",
            type=str,
            help="Directory to write files to",
            default=os.getcwd(),
        )
        parser.add_argument(
            "--output-filename",
            action="store",
            type=str,
            help="Filename to write files to",
            default="loading.html",
        )
        parser.add_argument(
            "--reload",
            action="store_true",
            default=False,
            help="Show reload controls and messaging",
        )
        parser.add_argument(
            "--version-text",
            action="store",
            default="",
            type=str,
            help="Version text to use in the loading page",
        )

    def handle(self, *args, **options):
        output_dir = options["output_dir"]
        output_filename = options["output_filename"]
        context = {
            "reload": options["reload"],
            "version_text": options["version_text"],
        }
        for lang in KOLIBRI_SUPPORTED_LANGUAGES:
            os.makedirs(os.path.join(output_dir, lang), exist_ok=True)
            with override(lang):
                rendered = render_to_string("kolibri/loading_page.html", context)
            with open(os.path.join(output_dir, lang, output_filename), "w") as f:
                f.write(rendered)
            logger.info("Created loading page for {lang}".format(lang=lang))
        logger.info("Created loading pages in all supported languages")
