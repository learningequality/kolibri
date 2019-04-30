import json
import socket

import requests
from morango.api.serializers import CertificateSerializer
from morango.certificates import Certificate
from morango.certificates import Nonce
from morango.constants.api_urls import NONCE
from six.moves.urllib.parse import urljoin

from kolibri.core.auth.constants.morango_scope_definitions import FULL_FACILITY
from kolibri.utils import conf


def claim(token, facility, client_ip=None):

        # get client ip if not passed in
        if not client_ip:
            hostname = socket.gethostname()
            client_ip = socket.gethostbyname(hostname)

        # request the server for a one-time-use nonce
        PORTAL_URL = conf.OPTIONS['Urls']['DATA_PORTAL_SYNCING_BASE_URL']
        response = requests.post(urljoin(PORTAL_URL, NONCE))
        response.raise_for_status()
        server_nonce = response.json()['id']

        # get owned certificate for this facility
        client_cert = facility.dataset.get_owned_certificates().filter(scope_definition_id=FULL_FACILITY).first()
        if client_cert is None:
            raise Certificate.DoesNotExist

        client_nonce = Nonce.objects.create(ip=client_ip)
        # build up data for request
        data = {
            'facility_id': facility.id,
            'client_nonce': client_nonce.id,
            'server_nonce': server_nonce,
            'client_certificate_id': client_cert.id,
            'certificate_chain': json.dumps(CertificateSerializer(client_cert.get_ancestors(include_self=True), many=True).data),
            'token': token,
        }

        # sign the client/server nonce combo to attach to the request
        message = "{client_nonce}:{server_nonce}".format(**data)
        data["signature"] = client_cert.sign(message)

        # attempt to claim the facility
        response = requests.post(urljoin(PORTAL_URL, 'portal/api/claim/'), data=data)
        Nonce.use_nonce(client_nonce.id)
        response.raise_for_status()
        return response
