set -eo pipefail

if [ ! -z "$NANOBOX_APP_NAME" ] && [ "$BUILDKITE_PULL_REQUEST" = "false" ]; then

    # Add the app name to the nanobox remote
    REMOTEADD="$(nanobox remote add $NANOBOX_APP_NAME)"
    REMOTEADDFAIL="Sorry"
    REMOTEADDSUCCESS="linked"

    if [ -z "${REMOTEADD##*$REMOTEADDSUCCESS*}" ]; then
        echo "Added $NANOBOX_APP_NAME as a remote to Nanobox."
        # Copy the generated pex file to deploy/kolibri.pex
        buildkite-agent artifact download 'dist/*.pex' deploy/
        mv deploy/dist/*.pex deploy/kolibri.pex

        # Deploy the app
        echo "Deploying $NANOBOX_APP_NAME to Nanobox..."
        nanobox deploy "$NANOBOX_APP_NAME"
    elif [ -z "${REMOTEADD##*$REMOTEADDFAIL*}" ]; then
        echo "The remote $NANOBOX_APP_NAME does not exist on Nanobox."
    else
        echo "The outputs of the command `nanobox remote add` are changed."
    fi

else
    echo "This is a pull request. Nanobox will not deploy the app."

fi
