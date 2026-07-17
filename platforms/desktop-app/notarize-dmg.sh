#!/bin/bash

DISK_IMAGE_PATH="$1"

xcrun notarytool submit \
"${DISK_IMAGE_PATH}" \
--apple-id "${MAC_NOTARIZE_USERNAME}" \
--team-id "${MAC_NOTARIZE_TEAM_ID}" \
--password "${MAC_NOTARIZE_PASSWORD}" \
--wait

notarize_exit=$?

if [ "${notarize_exit}" != "0" ]
then
	echo "Notarization failed: ${notarize_exit}"
	exit 1
fi

# -------- Staple DMG

echo "Stapling notarization result..."
xcrun stapler staple -v "${DISK_IMAGE_PATH}"

# -------- Validate stapled DMG

spctl --assess --type open --context context:primary-signature -v "${DISK_IMAGE_PATH}"
