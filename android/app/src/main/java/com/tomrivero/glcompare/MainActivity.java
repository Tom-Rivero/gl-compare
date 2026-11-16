package com.tomrivero.glcompare;

import android.os.Bundle;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Les plugins locaux doivent être enregistrés avant super.onCreate
        registerPlugin(WindowBackgroundPlugin.class);
        super.onCreate(savedInstanceState);

        // Pas de zoom dans la WebView (pincement, double tap), en plus du viewport de index.html
        if (bridge != null && bridge.getWebView() != null) {
            android.webkit.WebSettings settings = bridge.getWebView().getSettings();
            settings.setSupportZoom(false);
            settings.setBuiltInZoomControls(false);
            settings.setDisplayZoomControls(false);
        }

        // Geste / bouton retour : on demande d'abord à la page (window.onAndroidBack, js/app.js) de le
        // gérer, par exemple pour fermer les paramètres comme sur la webapp ; sinon Android quitte l'appli.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (bridge == null || bridge.getWebView() == null) {
                    exit();
                    return;
                }
                bridge.getWebView().evaluateJavascript(
                    "(window.onAndroidBack && window.onAndroidBack()) === true",
                    result -> {
                        if (!"true".equals(result)) exit();
                    }
                );
            }

            private void exit() {
                setEnabled(false);
                getOnBackPressedDispatcher().onBackPressed();
                setEnabled(true);
            }
        });
    }
}
