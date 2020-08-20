import initialization

import django
import os

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend
from twisted.internet import reactor
from twisted.cred import portal, checkers, error, credentials
from twisted.conch import manhole, manhole_ssh
from twisted.conch.ssh import keys
from zope.interface import implementer


def get_key_pair(refresh=False):

    # calculate paths where we'll store our SSH server keys
    KEYPATH = os.path.join(os.environ.get("KOLIBRI_HOME", "."), "ssh_host_key")
    PUBKEYPATH = KEYPATH + ".pub"
    
    # check whether we already have keys there, and use them if so
    if os.path.isfile(KEYPATH) and os.path.isfile(PUBKEYPATH) and not refresh:
        with open(KEYPATH) as f, open(PUBKEYPATH) as pf:
            return f.read(), pf.read()

    # otherwise, generate a new key pair and serialize it
    key = rsa.generate_private_key(
        backend=default_backend(),
        public_exponent=65537,
        key_size=2048
    )
    private_key = key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.TraditionalOpenSSL,
        serialization.NoEncryption()).decode()
    public_key = key.public_key().public_bytes(
        serialization.Encoding.OpenSSH,
        serialization.PublicFormat.OpenSSH
    ).decode()

    # store the keys to disk for use again later
    with open(KEYPATH, "w") as f, open(PUBKEYPATH, "w") as pf:
        f.write(private_key)
        pf.write(public_key)

    return private_key, public_key


@implementer(checkers.ICredentialsChecker)
class KolibriSuperAdminCredentialsChecker(object):
    """
    Check that the device is unprovisioned, or the credentials are for a super admin.
    """
    credentialInterfaces = (credentials.IUsernamePassword,)

    def requestAvatarId(self, creds):
        from kolibri.core.auth.models import FacilityUser

        # if there are no users yet (not yet provisioned), allow anon
        if FacilityUser.objects.count() == 0:
            return creds.username

        # check whether there are any super admins with these credentials
        users = FacilityUser.objects.filter(username=creds.username)
        for user in users:
            if user.is_superuser and user.check_password(creds.password):
                return creds.username

        # no matching users were found, so fail
        return defer.fail(error.UnauthorizedLogin())


def _get_manhole_factory(namespace):

    # ensure django has been set up so we can use the ORM etc in the shell
    django.setup()

    # set up the twisted manhole with Kolibri-based authentication
    def get_manhole(_):
        return manhole.Manhole(namespace)
    realm = manhole_ssh.TerminalRealm()
    realm.chainedProtocolFactory.protocolFactory = get_manhole
    p = portal.Portal(realm)
    p.registerChecker(KolibriSuperAdminCredentialsChecker())
    f = manhole_ssh.ConchFactory(p)
    
    # get the SSH server key pair to use
    private_rsa, public_rsa = get_key_pair()
    f.publicKeys[b"ssh-rsa"] = keys.Key.fromString(public_rsa)
    f.privateKeys[b"ssh-rsa"] = keys.Key.fromString(private_rsa)
    
    return f


def launch_remoteshell(port=4242):
    reactor.listenTCP(port, _get_manhole_factory(globals()))
    reactor.run()
