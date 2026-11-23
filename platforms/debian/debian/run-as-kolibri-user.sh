# -*- sh -*-
# Sourced as root after /etc/default/kolibri has set KOLIBRI_USER.

# Safeguard $KOLIBRI_USER, because if it is somehow unset, we will
# be running kolibri as root user.
if test "$KOLIBRI_USER" = ""
then
  echo "KOLIBRI_USER not defined"
  exit 1
fi

# Ubuntu 16.04 ships no setpriv; --ambient-caps was added in util-linux 2.31.
if setpriv --inh-caps +net_bind_service --ambient-caps +net_bind_service true 2>/dev/null
then
  run_as_kolibri_user() {
    IFS=: read -r _ _ kolibri_uid kolibri_gid _ kolibri_home kolibri_shell <<EOF
$(getent passwd "$KOLIBRI_USER")
EOF
    HOME="$kolibri_home" SHELL="$kolibri_shell" USER="$KOLIBRI_USER" LOGNAME="$KOLIBRI_USER" \
    setpriv --reuid="$kolibri_uid" --regid="$kolibri_gid" --init-groups \
      --inh-caps +net_bind_service --ambient-caps +net_bind_service \
      /bin/sh -c "$1"
  }
else
  # Prefer runuser over su
  # See: https://github.com/learningequality/kolibri-installer-debian/issues/90
  # Check if runuser exists - it doesn't on 14.04
  if which runuser > /dev/null
  then
    SU_COMMAND="runuser"
  else
    SU_COMMAND="su"
  fi

  # We wanted this pattern, but it doesn't work on Ubuntu 14.04
  # because $HOME is unavailable when preserving the env with -p.
  #   su $KOLIBRI_USER -l -p -s /bin/sh -c "COMMAND"
  # However, this seems to preserve environment and switch $HOME
  # by default on both 14.04 and 16.04:
  #   su kolibri -c "COMMAND"
  run_as_kolibri_user() {
    $SU_COMMAND "$KOLIBRI_USER" -c "$1"
  }
fi
