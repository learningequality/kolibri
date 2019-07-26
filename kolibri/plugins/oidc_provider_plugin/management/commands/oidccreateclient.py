import binascii
import logging
import os

from django.core.management.base import BaseCommand
from django.db import IntegrityError
from oidc_provider.models import Client
from oidc_provider.models import ResponseType

logger = logging.getLogger(__name__)

"""
Usage example:
kolibri manage oidccreateclient  --name="hooooo" --redirect-uri="http://otro/callback"
"""


class Command(BaseCommand):
    help = "Command to add new clients applications that will use kolibri as an OpenID Connect provider"

    def add_arguments(self, parser):
        parser.add_argument(
            "--name",
            action="store",
            dest="name",
            required=True,
            help="Specifies the name to identify the client. It is an informative value.",
        )
        parser.add_argument(
            "--clientid",
            action="store",
            dest="client_id",
            help="OpenID Connect client ID to be used. If it's not provided it will be the same as the name",
        )
        parser.add_argument(
            "--redirect-uri",
            action="store",
            dest="redirect_uri",
            required=True,
            help="Path to redirect to on successful login",
        )
        parser.add_argument(
            "--clientsecret",
            action="store",
            dest="client_secret",
            required=False,
            help="Secret phrase to check the client in a secure channel",
        )

    def handle(self, *args, **options):
        client_id = (
            options["name"] if not options["client_id"] else options["client_id"]
        )
        client_secret = options["client_secret"]
        if not client_secret:
            client_secret = binascii.hexlify(os.urandom(16))
        allowed_responses = ("code", "id_token", "id_token token")
        response_codes = ResponseType.objects.filter(value__in=allowed_responses)

        try:
            new_client = Client.objects.create(
                name=options["name"],
                client_type="public",
                client_id=client_id,
                client_secret=client_secret,
                jwt_alg="RS256",
                reuse_consent=True,
                require_consent=False,
                _redirect_uris=options["redirect_uri"],
                _scope="openid profile",
            )
            new_client.save()
            new_client.response_types = response_codes

            logger.warn(
                "Client {id} created with client secret {secret}".format(
                    id=client_id, secret=client_secret
                )
            )
        except IntegrityError:
            logger.error(
                "Client {id} could not be created. A client with the same id already exists in the database".format(
                    id=client_id
                )
            )
        except Exception as e:
            logger.error(
                "Client {id} could not be created. There was an error {error}".format(
                    id=client_id, error=e.message
                )
            )
