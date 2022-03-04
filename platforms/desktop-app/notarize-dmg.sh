#!/bin/bash
PLIST_BUDDY='/usr/libexec/PlistBuddy'

primary_bundle_identifier=$( "${PLIST_BUDDY}" -c "Print CFBundleIdentifier" "dist/Kolibri.app/Contents/Info.plist" )

DISK_IMAGE_PATH="$1"

xcrun altool --notarize-app \
--type osx \
--primary-bundle-id "org.learningequality.Kolibri" \
--username "${MAC_NOTARIZE_USERNAME}" \
--password "${MAC_NOTARIZE_PASSWORD}" \
--file "${DISK_IMAGE_PATH}" \
--output-format xml | tee "build/notarize_result.plist"

notarize_exit=$?

if [ "${notarize_exit}" != "0" ]
then
	echo "Notarization failed: ${notarize_exit}"
	cat "build/notarize_result.plist"
	exit 1
fi

request_uuid="$("${PLIST_BUDDY}" -c "Print notarization-upload:RequestUUID"  "build/notarize_result.plist")"
echo "Notarization UUID: ${request_uuid} result: $("${PLIST_BUDDY}" -c "Print success-message"  "build/notarize_result.plist")"


# -------- Wait for notarization result

for (( ; ; ))
do
	xcrun altool --notarization-info "${request_uuid}" \
	-u "${MAC_NOTARIZE_USERNAME}" \
	-p "${MAC_NOTARIZE_PASSWORD}" \
	--output-format xml \
	| tee "build/notarize_status.plist"

	notarize_exit=$?
	if [ "${notarize_exit}" != "0" ]
	then
		echo "Notarization failed: ${notarize_exit}"
		cat "build/notarize_status.plist"
		exit 1
	fi
	notarize_status="$("${PLIST_BUDDY}" -c "Print notarization-info:Status"  "build/notarize_status.plist")"
	if [ "${notarize_status}" == "in progress" ]
	then
        echo "Waiting for notarization to complete"
        sleep 10
    else
    	echo "Notarization status: ${notarize_status}"
    	break
	fi
done

# -------- Staple DMG

echo "Stapling notarization result..."
for (( ; ; ))
do
    xcrun stapler staple -q "${DISK_IMAGE_PATH}"
    stapler_status=$?
    if [ "${stapler_status}" = "65" ]
    then
        echo "Waiting for stapling to find record"
        sleep 10
    else
        echo "Stapler status: ${stapler_status}"
        break
    fi
done


# -------- Validate stapled DMG

spctl --assess --type open --context context:primary-signature -v "${DISK_IMAGE_PATH}"
