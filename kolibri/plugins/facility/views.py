from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import io
import os
from datetime import datetime

from django.http import Http404
from django.http.response import FileResponse
from django.template.defaultfilters import slugify
from django.utils import translation
from django.utils.decorators import method_decorator
from django.utils.translation import get_language_from_request
from django.utils.translation import pgettext
from django.views.generic.base import TemplateView

from kolibri.core.auth.models import Facility
from kolibri.core.decorators import cache_no_user_data
from kolibri.utils import conf


@method_decorator(cache_no_user_data, name="dispatch")
class FacilityManagementView(TemplateView):
    template_name = "facility_management.html"


def download_csv_file(request, filename, facility_id):
    if facility_id:
        facility_name = Facility.objects.get(pk=facility_id).name
    else:
        facility_name = request.user.facility.name

    locale = get_language_from_request(request)
    translation.activate(locale)
    filepath = os.path.join(conf.KOLIBRI_HOME, "temp", filename)

    # if the file does not exist on disk, return a 404
    if filepath is None or not os.path.exists(filepath):
        raise Http404("Creation of users export file has failed")

    # generate a file response
    response = FileResponse(io.open(filepath, "rb"))
    # set the content-type by guessing from the filename
    response["Content-Type"] = "text/csv"

    # set the content-disposition as attachment to force download
    exported_filename = (
        slugify(
            pgettext(
                "Default name for the exported CSV file of facility user data. Please keep the underscore between words in the translation",
                "users_{}",
            ).format(datetime.now().strftime("%Y%m%d_%H%M%S"))
        ).replace("-", "_")
        + ".csv"
    )

    # Append the facility name to the beginning of the filename
    filename_with_facility = "{}_{}".format(facility_name, str(exported_filename))
    response["Content-Disposition"] = "attachment; filename={}".format(
        filename_with_facility
    )

    # set the content-length to the file size
    response["Content-Length"] = os.path.getsize(filepath)
    translation.deactivate()

    return response
