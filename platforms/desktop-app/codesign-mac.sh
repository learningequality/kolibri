#!/bin/bash
regex="RequestUUID = ([A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12})"

# Codesign the DMG
xcrun codesign --force --sign "Developer ID Application: ${MAC_CODESIGN_ID}" "dist/kolibri-${KOLIBRI_VERSION}-${APP_BUILD_NUMBER}.dmg"
# Notarize
output=$(xcrun altool --notarize-app --file "dist/kolibri-${KOLIBRI_VERSION}-${APP_BUILD_NUMBER}.dmg" --type osx --username ${MAC_DEV_ID_EMAIL} --primary-bundle-id "org.learningequality.Kolibri" --password ${MAC_CODESIGN_PWD})

[[ "$output" =~ $regex ]]
uuid="${BASH_REMATCH[1]}"

exit_status=65
for (( ; ; ))
do
    # Check for notarization being complete, and staple if so
    xcrun stapler staple "dist/kolibri-${KOLIBRI_VERSION}-${APP_BUILD_NUMBER}.dmg"
    exit_status=$?
    if [ "${exit_status}" = "65" ]
    then
        echo "Waiting for notarization to complete"
        sleep 10
    else
        echo "Stapler status: ${exit_status}"
        break
    fi
done

spctl --assess --type open --context context:primary-signature --verbose "dist/kolibri-${KOLIBRI_VERSION}-${APP_BUILD_NUMBER}.dmg"
