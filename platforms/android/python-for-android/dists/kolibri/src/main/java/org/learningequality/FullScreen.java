package org.learningequality;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.view.View;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import org.kivy.android.PythonActivity;

public class FullScreen {
    public PythonActivity mActivity;
    public WebView mWebView;
    public MyChrome mChrome;

    public FullScreen(PythonActivity activity) {
        mActivity = activity;
        mWebView = (WebView) activity.getLayout().getChildAt(0);
        mChrome = new MyChrome(activity);
    }

    public static void configureWebview(PythonActivity activity) {
        FullScreen fs = new FullScreen(activity);
        fs.configure();
    }

    // Configure the WebView to allow fullscreen based on:
    // https://stackoverflow.com/questions/15768837/playing-html5-video-on-fullscreen-in-android-webview/56186877#56186877
    public void configure() {
        mWebView.setWebViewClient(new WebViewClient() {

            @Override
            public void onPageFinished(WebView view, String url) {
                CookieManager.getInstance().setAcceptCookie(true);
                CookieManager.getInstance().acceptCookie();
                CookieManager.getInstance().flush();

            }


        });
        mWebView.setWebChromeClient(mChrome);
        WebSettings webSettings = mWebView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setCacheMode(WebSettings.LOAD_DEFAULT);
    }

    private class MyChrome extends WebChromeClient {

        private View mCustomView;
        private WebChromeClient.CustomViewCallback mCustomViewCallback;
        protected FrameLayout mFullscreenContainer;
        private int mOriginalOrientation;
        private int mOriginalSystemUiVisibility;
        public PythonActivity mActivity = null;

        MyChrome(PythonActivity activity) {
            mActivity = activity;
        }

        public Bitmap getDefaultVideoPoster()
        {
            if (mCustomView == null) {
                return null;
            }
            return BitmapFactory.decodeResource(mActivity.getApplicationContext().getResources(), 2130837573);
        }

        public void onHideCustomView()
        {
            ((FrameLayout)mActivity.getWindow().getDecorView()).removeView(this.mCustomView);
            this.mCustomView = null;
            mActivity.getWindow().getDecorView().setSystemUiVisibility(this.mOriginalSystemUiVisibility);
            mActivity.setRequestedOrientation(this.mOriginalOrientation);
            this.mCustomViewCallback.onCustomViewHidden();
            this.mCustomViewCallback = null;
        }

        public void onShowCustomView(View paramView, WebChromeClient.CustomViewCallback paramCustomViewCallback)
        {
            if (this.mCustomView != null)
            {
                onHideCustomView();
                return;
            }
            this.mCustomView = paramView;
            this.mOriginalSystemUiVisibility = mActivity.getWindow().getDecorView().getSystemUiVisibility();
            this.mOriginalOrientation = mActivity.getRequestedOrientation();
            this.mCustomViewCallback = paramCustomViewCallback;
            ((FrameLayout)mActivity.getWindow().getDecorView()).addView(this.mCustomView, new FrameLayout.LayoutParams(-1, -1));
            mActivity.getWindow().getDecorView().setSystemUiVisibility(3846 | View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
        }
    }
}
