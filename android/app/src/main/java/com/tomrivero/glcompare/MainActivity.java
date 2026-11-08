package com.tomrivero.glcompare;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Les plugins locaux doivent être enregistrés avant super.onCreate
        registerPlugin(WindowBackgroundPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
