import { createTranslator } from 'kolibri/utils/i18n';

export const httpPortStrings = createTranslator('HttpPortStrings', {
  advancedOptionsAction: {
    message: 'Advanced options',
    context:
      'Button on the first setup screen that shows or hides less common settings, such as the network port Kolibri uses.',
  },
  portFetchError: {
    message: 'Could not load the port Kolibri is using.',
    context: 'Shown instead of the port setting when it could not be loaded from the server.',
  },
  portHeading: {
    message: 'Port',
    context:
      'Heading of the device settings section where a super admin can change the network port this Kolibri server is reached on.',
  },
  portDescription: {
    message:
      'The network port in the address of this Kolibri server, such as the "8080" of http://kolibri.local:8080/. Changing it restarts Kolibri.',
    context: 'Description under the "Port" heading in device settings.',
  },
  portLabel: {
    message: 'Port',
    context:
      'Label of the number field holding the network port this Kolibri server is reached on, as in the "8080" of http://kolibri.local:8080/.',
  },
  portOutOfRange: {
    message: 'Enter a number from 1 to 65535',
    context: 'Error shown under the port field when the number entered is not a valid port.',
  },
  changePortAction: {
    message: 'Change port',
    context:
      'Button that restarts Kolibri on the port entered in the port field, and title of the window asking to confirm that.',
  },
  changePortConfirmation: {
    message:
      'Kolibri will restart on port {port}. Anyone using Kolibri on this server right now will temporarily be unable to use it, and saved links to the current address will stop working.',
    context: 'Shown in a window asking the user to confirm a change of the port Kolibri uses.',
  },
  pendingSettingsSavedToo: {
    message: 'Any other changes you have made on this page will be saved first.',
    context:
      'Shown in the window asking to confirm a port change on the device settings page, whose other settings are otherwise saved with a separate button.',
  },
  restartingOnPort: {
    message: 'Restarting Kolibri on port {port}…',
    context:
      'Shown while Kolibri restarts on a new port. The page opens the new address once Kolibri is ready.',
  },
  portInUseByProcess: {
    message: 'Port {port} is in use by {process}.',
    context:
      'Shown when Kolibri cannot use a port because another program holds it. {process} is the name of that program, not translated, such as "nginx (nginx.service)".',
  },
  portInUseByUser: {
    message: 'Port {port} is in use by a program run by the user {user}.',
    context:
      'Shown when Kolibri cannot use a port because a program of another operating system user holds it. {user} is that user name, such as "root".',
  },
  portInUse: {
    message: 'Port {port} is in use by another program.',
    context: 'Shown when Kolibri cannot use a port because an unidentified program holds it.',
  },
  portPermissionDenied: {
    message: 'Kolibri does not have permission to use port {port}.',
    context:
      'Shown when the operating system does not let Kolibri use a port, as is usual for ports below 1024.',
  },
  portUnavailable: {
    message: 'Port {port} cannot be used: {detail}',
    context:
      'Shown when Kolibri cannot use a port for another reason. {detail} is the error message from the operating system, not translated.',
  },
  stillOnPort: {
    message: 'Kolibri is still using port {port}.',
    context: 'Follows a message saying why Kolibri could not change to a new port.',
  },
  portChangeUnconfirmed: {
    message:
      'Kolibri could not confirm the change to port {port}. Restart Kolibri, then check which port it uses.',
    context:
      'Shown when a port change failed for an unexpected reason, so the new port may or may not have been saved.',
  },
  cannotRestart: {
    message:
      'Kolibri is using port {port}. This server cannot restart itself, so the port cannot be changed here.',
    context:
      'Shown instead of the port field when Kolibri is run in a way that a port change could not take effect, such as behind a separate web server.',
  },
  setByEnvironmentVariable: {
    message:
      'Kolibri is using port {port}, set by an environment variable. To change it, change that variable and restart Kolibri.',
    context:
      'Shown instead of the port field when the port comes from an operating system environment variable such as KOLIBRI_HTTP_PORT.',
  },
  setByCommandLine: {
    message:
      'Kolibri is using port {port}, set by the command that started it. To change it, start Kolibri with a different port.',
    context:
      'Shown instead of the port field when the port was given on the command line that started Kolibri, as with "kolibri start --port".',
  },
  advertisedPortSet: {
    message:
      'Kolibri is using port {port}. The port cannot be changed here while an advertised port is set in the Kolibri options.',
    context:
      'Shown instead of the port field when the Kolibri options set the port that other devices are told to use, so a change here would not reach them.',
  },
  browserPortMismatch: {
    message:
      'Kolibri is using port {port}, but this browser reaches it through a different port, such as through a proxy or port forwarding. To change the port, change the Kolibri options and restart Kolibri.',
    context:
      'Shown instead of the port field when the address in the browser does not use the port Kolibri serves on, so a change here could make Kolibri unreachable.',
  },
});
