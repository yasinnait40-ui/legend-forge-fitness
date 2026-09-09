package com.aethora.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AethoraAdsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
