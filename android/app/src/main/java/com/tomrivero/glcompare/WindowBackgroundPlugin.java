package com.tomrivero.glcompare;

import android.graphics.Color;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// Couleur du fond de la fenêtre, visible derrière la barre d'état et la barre de navigation
// quand la WebView ne s'étend pas sous elles (WebView < 140 : Capacitor décale alors la page).
// Appelé par js/theme.js pour que ces bandes suivent le thème clair / sombre.
@CapacitorPlugin(name = "WindowBackground")
public class WindowBackgroundPlugin extends Plugin {

    @PluginMethod
    public void setColor(PluginCall call) {
        String color = call.getString("color");
        int parsed;
        try {
            parsed = Color.parseColor(color);
        } catch (Exception e) {
            call.reject("Couleur invalide : " + color);
            return;
        }
        getActivity().runOnUiThread(() -> {
            getActivity().getWindow().getDecorView().setBackgroundColor(parsed);
            call.resolve();
        });
    }
}
