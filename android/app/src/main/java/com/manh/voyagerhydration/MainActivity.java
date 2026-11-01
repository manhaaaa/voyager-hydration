package com.manh.voyagerhydration;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int REQ_POST_NOTIFICATIONS = 1001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // 1. Pre-create high-importance notification channels with Voyager audio
        VoyagerNotificationService.ensureChannelsExist(this);

        // 2. Request POST_NOTIFICATIONS runtime permission on Android 13+ (API 33+)
        if (Build.VERSION.SDK_INT >= 33) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(
                    this,
                    new String[] { Manifest.permission.POST_NOTIFICATIONS },
                    REQ_POST_NOTIFICATIONS
                );
            }
        }

        // 3. Start background notification guardian service
        startNotificationGuardianService();
    }

    @Override
    public void onResume() {
        super.onResume();
        VoyagerNotificationService.ensureChannelsExist(this);
        startNotificationGuardianService();
    }

    private void startNotificationGuardianService() {
        try {
            Intent serviceIntent = new Intent(this, VoyagerNotificationService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent);
            } else {
                startService(serviceIntent);
            }
        } catch (Exception ignored) {
        }
    }
}
