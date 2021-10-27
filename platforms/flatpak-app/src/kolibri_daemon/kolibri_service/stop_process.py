from __future__ import annotations

from .context import KolibriServiceProcess


class StopProcess(KolibriServiceProcess):
    """
    Stops Kolibri using the cli command. This runs as a separate process to
    avoid blocking the rest of the program while Kolibri is stopping.
    """

    PROCESS_NAME: str = "kolibri-daemon-stop"

    def run(self):
        super().run()

        if self.context.is_stopped:
            return
        elif self.context.await_start_result() != self.context.StartResult.SUCCESS:
            return

        self.__kolibri_setup()

    def __kolibri_setup(self):
        from kolibri.utils.cli import stop

        try:
            stop.callback()
        except SystemExit:
            # Kolibri calls sys.exit here, but we don't want to exit
            pass

        self.context.is_stopped = True
