
# kolibri whl file must be located in the current directory
rm -r code/kolibri
unzip "kolibri*.whl" "kolibri/*" -d code/

docker build -t kolibrikivy .

docker run -i --rm -v ${PWD}:/mnt/output kolibrikivy /bin/bash << COMMANDS
cp /*.apk /mnt/output
echo Changing owner from \$(id -u):\$(id -g) to $(id -u):$(id -u)
chown -R $(id -u):$(id -u) /mnt/output
COMMANDS
