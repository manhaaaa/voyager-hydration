package com.manh.voyagerhydration;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import androidx.core.app.NotificationCompat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.Map;
import java.util.TimeZone;
import org.json.JSONObject;

/**
 * VoyagerNotificationService
 * Keeps background hydration reminders and Voyager alarms reliable on Android 8 - 15+,
 * even when the WebView is suspended or OEM battery savers throttle AlarmManager broadcasts.
 */
public class VoyagerNotificationService extends Service {
    public static final String BG_SERVICE_CHANNEL_ID = "voyager_bg_guardian";
    public static final String REMINDER_CHANNEL_ID = "voyager_hydration_reminders";
    public static final int FOREGROUND_SERVICE_NOTIFICATION_ID = 8899;
    private static final String CAPACITOR_NOTIFICATION_STORE = "NOTIFICATION_STORE_ID";
    private static final long CHECK_INTERVAL_MS = 4000L;

    private Handler handler;
    private Runnable checkTask;

    @Override
    public void onCreate() {
        super.onCreate();
        ensureChannelsExist(this);
        startForegroundGuardian();

        handler = new Handler(Looper.getMainLooper());
        checkTask = new Runnable() {
            @Override
            public void run() {
                try {
                    checkAndDispatchDueNotifications();
                } catch (Exception ignored) {
                } finally {
                    if (handler != null) {
                        handler.postDelayed(this, CHECK_INTERVAL_MS);
                    }
                }
            }
        };
        handler.postDelayed(checkTask, CHECK_INTERVAL_MS);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        ensureChannelsExist(this);
        startForegroundGuardian();
        checkAndDispatchDueNotifications();
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        if (handler != null && checkTask != null) {
            handler.removeCallbacks(checkTask);
        }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void startForegroundGuardian() {
        try {
            Intent openIntent = new Intent(this, MainActivity.class);
            openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            int pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                pendingFlags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, openIntent, pendingFlags);

            Notification notification = new NotificationCompat.Builder(this, BG_SERVICE_CHANNEL_ID)
                .setContentTitle("Voyager Hydration đang chạy ngầm ✨")
                .setContentText("Đang canh giờ nhắc uống nước & báo thức ngân hà cho bạn")
                .setSmallIcon(R.drawable.ic_stat_icon_config_sample)
                .setColor(0xFF38BDF8)
                .setOngoing(true)
                .setSilent(true)
                .setPriority(NotificationCompat.PRIORITY_LOW)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .setContentIntent(pendingIntent)
                .build();

            startForeground(FOREGROUND_SERVICE_NOTIFICATION_ID, notification);
        } catch (Exception ignored) {
        }
    }

    /**
     * Inspects Capacitor's NOTIFICATION_STORE_ID SharedPreferences.
     * If any scheduled notification is overdue by >= 2.5 seconds (meaning AlarmManager /
     * TimedNotificationPublisher was delayed or blocked by Doze/OEM restrictions),
     * fires it directly via Android's NotificationManager and removes it from storage.
     */
    private void checkAndDispatchDueNotifications() {
        SharedPreferences storage = getSharedPreferences(CAPACITOR_NOTIFICATION_STORE, Context.MODE_PRIVATE);
        Map<String, ?> allEntries = storage.getAll();
        if (allEntries == null || allEntries.isEmpty()) {
            return;
        }

        long nowMs = System.currentTimeMillis();
        NotificationManager notificationManager =
            (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (notificationManager == null) {
            return;
        }

        for (Map.Entry<String, ?> entry : allEntries.entrySet()) {
            String key = entry.getKey();
            Object rawVal = entry.getValue();
            if (!(rawVal instanceof String)) {
                continue;
            }

            try {
                JSONObject json = new JSONObject((String) rawVal);
                JSONObject schedule = json.optJSONObject("schedule");
                if (schedule == null) {
                    continue;
                }

                String atStr = schedule.optString("at", "");
                if (atStr.isEmpty()) {
                    continue;
                }

                Date scheduledDate = parseIsoDate(atStr);
                if (scheduledDate == null) {
                    continue;
                }

                long scheduledMs = scheduledDate.getTime();
                // Allow 2.5s grace window for Capacitor's TimedNotificationPublisher first
                if (nowMs >= scheduledMs + 2500L) {
                    int id = json.optInt("id", Integer.parseInt(key));
                    String title = json.optString("title", "Voyager nhắc bạn ✨");
                    String body = json.optString("body", "Hãy uống một ngụm nước mát cùng Voyager nhé!");
                    String channelId = json.optString("channelId", REMINDER_CHANNEL_ID);

                    // Remove from store first to guarantee single delivery
                    storage.edit().remove(key).apply();

                    // Wake screen briefly for heads-up visibility
                    acquireBriefWakeLock();

                    Intent openIntent = new Intent(this, MainActivity.class);
                    openIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                    int pendingFlags = PendingIntent.FLAG_UPDATE_CURRENT;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        pendingFlags |= PendingIntent.FLAG_IMMUTABLE;
                    }
                    PendingIntent contentIntent = PendingIntent.getActivity(this, id, openIntent, pendingFlags);

                    NotificationCompat.Builder builder = new NotificationCompat.Builder(this, channelId)
                        .setContentTitle(title)
                        .setContentText(body)
                        .setStyle(new NotificationCompat.BigTextStyle().bigText(body))
                        .setSmallIcon(R.drawable.ic_stat_icon_config_sample)
                        .setColor(0xFF38BDF8)
                        .setAutoCancel(true)
                        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                        .setPriority(NotificationCompat.PRIORITY_MAX)
                        .setCategory(NotificationCompat.CATEGORY_REMINDER)
                        .setDefaults(NotificationCompat.DEFAULT_VIBRATE | NotificationCompat.DEFAULT_LIGHTS)
                        .setContentIntent(contentIntent);

                    notificationManager.notify(id, builder.build());
                }
            } catch (Exception ignored) {
            }
        }
    }

    private void acquireBriefWakeLock() {
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            if (pm != null) {
                PowerManager.WakeLock wl = pm.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK,
                    "VoyagerHydration::ReminderWakeLock"
                );
                wl.acquire(5000L);
            }
        } catch (Exception ignored) {
        }
    }

    private Date parseIsoDate(String raw) {
        String[] patterns = new String[] {
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
            "yyyy-MM-dd'T'HH:mm:ss'Z'",
            "yyyy-MM-dd'T'HH:mm:ss.SSSZ",
            "yyyy-MM-dd'T'HH:mm:ssZ"
        };
        for (String pattern : patterns) {
            try {
                SimpleDateFormat sdf = new SimpleDateFormat(pattern, Locale.US);
                if (pattern.endsWith("'Z'")) {
                    sdf.setTimeZone(TimeZone.getTimeZone("UTC"));
                }
                return sdf.parse(raw);
            } catch (ParseException ignored) {
            }
        }
        return null;
    }

    public static void ensureChannelsExist(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        NotificationManager manager =
            (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) {
            return;
        }

        String pkg = context.getPackageName();
        AudioAttributes alarmAudioAttrs = new AudioAttributes.Builder()
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .setUsage(AudioAttributes.USAGE_NOTIFICATION)
            .build();

        // 1. Quiet Foreground Service Guardian Channel
        NotificationChannel bgChannel = new NotificationChannel(
            BG_SERVICE_CHANNEL_ID,
            "Chạy ngầm canh giờ uống nước",
            NotificationManager.IMPORTANCE_LOW
        );
        bgChannel.setDescription("Duy trì bộ đếm nhắc uống nước Voyager hoạt động ổn định trong nền");
        bgChannel.setShowBadge(false);
        manager.createNotificationChannel(bgChannel);

        // 2. Main Hydration Reminder Channel (HIGH importance for heads-up banner & sound)
        Uri violinUri = Uri.parse("android.resource://" + pkg + "/raw/voyager_violin");
        NotificationChannel reminderChannel = new NotificationChannel(
            REMINDER_CHANNEL_ID,
            "Nhắc nhở uống nước Voyager",
            NotificationManager.IMPORTANCE_HIGH
        );
        reminderChannel.setDescription("Kênh thông báo nhắc nhở uống nước vũ trụ Reverse: 1999");
        reminderChannel.enableVibration(true);
        reminderChannel.setSound(violinUri, alarmAudioAttrs);
        reminderChannel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        manager.createNotificationChannel(reminderChannel);

        // 3. Voyager Alarm Sound Channels
        createCustomSoundChannel(
            manager,
            "voyager_alarm_voyager_violin",
            "Báo thức Voyager - Violin Tinh cầu",
            Uri.parse("android.resource://" + pkg + "/raw/voyager_violin")
        );
        createCustomSoundChannel(
            manager,
            "voyager_alarm_voyager_greeting",
            "Báo thức Voyager - Lời chào Tinh cầu",
            Uri.parse("android.resource://" + pkg + "/raw/voyager_greeting")
        );
        createCustomSoundChannel(
            manager,
            "voyager_alarm_voyager_battle",
            "Báo thức Voyager - Khúc dạo đầu Vũ trụ",
            Uri.parse("android.resource://" + pkg + "/raw/voyager_battle")
        );
        createCustomSoundChannel(
            manager,
            "voyager_alarm_bubble",
            "Báo thức Voyager - Chuông pha lê",
            Uri.parse("android.resource://" + pkg + "/raw/voyager_violin")
        );
    }

    private static void createCustomSoundChannel(
        NotificationManager manager,
        String channelId,
        String channelName,
        Uri soundUri
    ) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return;
        }
        AudioAttributes attrs = new AudioAttributes.Builder()
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .setUsage(AudioAttributes.USAGE_ALARM)
            .build();

        NotificationChannel channel = new NotificationChannel(
            channelId,
            channelName,
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription(channelName + " (Reverse: 1999)");
        channel.enableVibration(true);
        channel.setSound(soundUri, attrs);
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        manager.createNotificationChannel(channel);
    }
}
