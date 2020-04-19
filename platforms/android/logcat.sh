main_pid=$(adb shell ps | grep ' org.learningequality.Kolibri$'  | tr -s [:space:] ' ' | cut -d' ' -f2)
server_pid=$(adb shell ps | grep ' org.learningequality.Kolibri:service_kolibri$'  | tr -s [:space:] ' ' | cut -d' ' -f2)
exclusion="NetworkManagementSocketTagger|Could not ping|No jobs|port:5000"
if [ -z "$server_pid" ]; then
    echo "Searching for: $main_pid"
    adb logcat | grep -E " $main_pid "
else
    echo "Searching for: $main_pid | $server_pid " | egrep -v "$exclusion"
    adb logcat | grep -E " $main_pid | $server_pid " | egrep -v "$exclusion"
fi