import datetime

from kolibri.core.fields import create_timezonestamp
from morango.utils.encoders import MorangoJSONEncoder


class MorangoJSONEncoder(MorangoJSONEncoder):

    def default(self, o):
        # helps to handle DateTimeTZField specs
        if isinstance(o, datetime.datetime):
            return create_timezonestamp(o)
        else:
            return super(MorangoJSONEncoder, self).default(o)
