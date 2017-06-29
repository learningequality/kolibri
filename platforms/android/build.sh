# NOTE: kolibri whl file must be located in the current directory

mkdir -p bin
rm bin/*.apk 2> /dev/null

docker build -t kolibrikivy .

docker run -i --rm -v ${PWD}/bin:/mnt/bin kolibrikivy /bin/bash << COMMANDS
cp /*.apk /mnt/bin
echo Changing owner from \$(id -u):\$(id -g) to $(id -u):$(id -u)
chown -R $(id -u):$(id -u) /mnt/bin
COMMANDS

