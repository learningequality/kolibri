#!/bin/bash
PLIST_BUDDY='/usr/libexec/PlistBuddy'

primary_bundle_identifier=$( "${PLIST_BUDDY}" -c "Print CFBundleIdentifier" "dist/Kolibri.app/Contents/Info.plist" )

DISK_IMAGE_PATH="$1"

xcrun notarytool submit \
"${DISK_IMAGE_PATH}" \
--primary-bundle-id "org.learningequality.Kolibri" \
--apple-id "${MAC_NOTARIZE_USERNAME}" \
--password "${MAC_NOTARIZE_PASSWORD}" \
--wait \
--output-format plist | tee "build/notarize_result.plist"

notarize_exit=$?

if [ "${notarize_exit}" != "0" ]
then
	echo "Notarization failed: ${notarize_exit}"
	cat "build/notarize_result.plist"
	exit 1
fi

request_uuid="$("${PLIST_BUDDY}" -c "Print notarization-upload:RequestUUID"  "build/notarize_result.plist")"
echo "Notarization UUID: ${request_uuid} result: $("${PLIST_BUDDY}" -c "Print success-message"  "build/notarize_result.plist")"

# -------- Staple DMG

echo "Stapling notarization result..."
xcrun stapler staple -v "${DISK_IMAGE_PATH}"

# -------- Validate stapled DMG

spctl --assess --type open --context context:primary-signature -v "${DISK_IMAGE_PATH}"
