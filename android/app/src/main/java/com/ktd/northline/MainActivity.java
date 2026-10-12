package com.ktd.northline;

import android.os.Bundle;
import android.graphics.Color;
import android.graphics.drawable.ColorDrawable;
import android.view.View;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle state) {super.onCreate(state); immersive();}
    @Override public void onWindowFocusChanged(boolean focused) {super.onWindowFocusChanged(focused);if(focused)immersive();}
    private void immersive() {
        getWindow().setBackgroundDrawable(new ColorDrawable(Color.parseColor("#0c1c27")));
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
        WindowInsetsControllerCompat controller = WindowCompat.getInsetsController(getWindow(),getWindow().getDecorView());
        controller.hide(WindowInsetsCompat.Type.systemBars());
        controller.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        if (getBridge()!=null && getBridge().getWebView()!=null) {
            getBridge().getWebView().setOverScrollMode(View.OVER_SCROLL_NEVER);
            if(getBridge().getWebView().getParent() instanceof View)((View)getBridge().getWebView().getParent()).setBackgroundColor(Color.parseColor("#0c1c27"));
        }
    }
}
