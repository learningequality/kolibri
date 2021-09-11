import os

from jnius import autoclass, PythonJavaClass, java_method


# reference to the activity
_PythonActivity = autoclass('org.kivy.android.PythonActivity')


class Runnable(PythonJavaClass):
    '''Wrapper around Java Runnable class. This class can be used to schedule a
    call of a Python function into the PythonActivity thread.
    '''

    __javainterfaces__ = ['java/lang/Runnable']
    __runnables__ = []

    def __init__(self, func):
        super(Runnable, self).__init__()
        self.func = func

    def __call__(self, *args, **kwargs):
        self.args = args
        self.kwargs = kwargs
        Runnable.__runnables__.append(self)
        _PythonActivity.mActivity.runOnUiThread(self)

    @java_method('()V')
    def run(self):
        try:
            self.func(*self.args, **self.kwargs)
        except:
            import traceback
            traceback.print_exc()

        Runnable.__runnables__.remove(self)

def run_on_ui_thread(f):
    '''Decorator to create automatically a :class:`Runnable` object with the
    function. The function will be delayed and call into the Activity thread.
    '''
    def f2(*args, **kwargs):
        Runnable(f)(*args, **kwargs)
    return f2


WebView = autoclass('android.webkit.WebView')
WebViewClient = autoclass('android.webkit.WebViewClient')
PythonWebViewClient = autoclass('org.kosoftworks.pyeverywhere.PEWebViewClient')
PythonActivity = autoclass('org.kivy.android.PythonActivity')
activity = PythonActivity.mActivity


@run_on_ui_thread
def set_fullscreen():
    Context = PythonActivity.mActivity
    view_instance = Context.getWindow().getDecorView()
    View = autoclass('android.view.View')
    flag = View.SYSTEM_UI_FLAG_LAYOUT_STABLE \
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION \
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN \
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION \
                | View.SYSTEM_UI_FLAG_FULLSCREEN \
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
    view_instance.setSystemUiVisibility(flag)


# Set loading screen
LOADER_URL = "file://{}".format(os.path.abspath(os.path.join("assets", "_load.html")))


class AndroidWebView(PythonJavaClass):
    __javainterfaces__ = ['org/kosoftworks/pyeverywhere/WebViewCallbacks']
    __javacontext__ = 'app'

    def __init__(self, app, url=None):
        super(AndroidWebView, self).__init__()
        self.app = app
        self.initialized = False
        self.load_complete = False
        self.current_url = None
        if url is None:
            url = LOADER_URL
        self.create_webview(url)
    
    def get_persisted_state(self):
        state = {}
        # Temporarily disable until we finish updates to p4a webview bootstrap
        # if PythonActivity.mSavedURL:
        #     state['URL'] = PythonActivity.mSavedURL

        return state

    @run_on_ui_thread
    def load_url(self, url):
        self.url = url
        if self.initialized:
            self.webview.loadUrl(url)

    @run_on_ui_thread
    def reload(self):
        self.webview.reload()

    @run_on_ui_thread
    def go_back(self):
        self.webview.goBack()

    @run_on_ui_thread
    def go_forward(self):
        self.webview.goForward()

    @run_on_ui_thread
    def clear_history(self):
        self.webview.clearHistory()

    @run_on_ui_thread
    def get_url(self):
        return self.webview.getUrl()

    @run_on_ui_thread
    def evaluate_javascript(self, js):
        self.webview.loadUrl('javascript:' + js, None)

    def get_user_agent(self):
        settings = self.webview.getSettings()
        return settings.getUserAgentString()

    def set_user_agent(self, user_agent):
        settings = self.webview.getSettings()
        settings.setUserAgentString(user_agent)

    @run_on_ui_thread
    def create_webview(self, url):
        self.client = PythonWebViewClient()
        self.webview = PythonActivity.mWebView  # WebView(activity)
        self.webview.setWebContentsDebuggingEnabled(True)
        settings = self.webview.getSettings()
        settings.setJavaScriptEnabled(True)
        settings.setAllowFileAccessFromFileURLs(True)
        settings.setAllowUniversalAccessFromFileURLs(True)
        settings.setMediaPlaybackRequiresUserGesture(False)
        settings.setDomStorageEnabled(True)
        self.webview.setWebViewClient(self.client)
        self.setWebView(self)
        self.initialized = True
        self.load_url(url)
    
    @java_method('(Landroid/webkit/WebView;Ljava/lang/String;)Z')
    def shouldLoadURL(self, view, url):
        return self.app.should_load_url(url)

    @java_method('(Landroid/webkit/WebView;Ljava/lang/String;)V')
    def pageLoadComplete(self, view, url):
        if self.current_url is None:
            activity.removeLoadingScreen()

        # Make sure that any attempts to use back functionality don't take us back to the loading screen
        # For more info, see: https://stackoverflow.com/questions/8103532/how-to-clear-webview-history-in-android
        if self.current_url == LOADER_URL and url != LOADER_URL:
            self.clear_history()

        self.current_url = url
