"""
Runnable
========

"""
from jnius import autoclass
from jnius import java_method
from jnius import PythonJavaClass

# reference to the activity
_PythonActivity = autoclass("org.kivy.android.PythonActivity")


class Runnable(PythonJavaClass):
    """Wrapper around Java Runnable class. This class can be used to schedule a
    call of a Python function into the PythonActivity thread.
    """

    __javainterfaces__ = ["java/lang/Runnable"]
    __runnables__ = []

    def __init__(self, func):
        super(Runnable, self).__init__()
        self.func = func

    def __call__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs
        Runnable.__runnables__.append(self)
        _PythonActivity.mActivity.runOnUiThread(self)

    @java_method("()V")
    def run(self):
        try:
            self.func(*self.args, **self.kwargs)
        except Exception:
            import traceback

            traceback.print_exc()

        Runnable.__runnables__.remove(self)
