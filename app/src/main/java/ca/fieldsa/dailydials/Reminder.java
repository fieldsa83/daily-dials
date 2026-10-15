package ca.fieldsa.dailydials;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.util.Calendar;
import java.util.List;
import java.util.Locale;

/**
 * Schedules the daily reminder and runs the check-in inside the notification:
 * each tap saves one dial and the same notification moves on to the next one.
 */
final class Reminder {
    static final int NOTIFICATION_ID = 1;
    static final String ACTION_REMIND = "ca.fieldsa.dailydials.REMIND";
    static final String ACTION_NUDGE = "ca.fieldsa.dailydials.NUDGE";
    static final String ACTION_ANSWER = "ca.fieldsa.dailydials.ANSWER";
    static final String ACTION_SNOOZE = "ca.fieldsa.dailydials.SNOOZE";
    static final String ACTION_SKIP_DAY = "ca.fieldsa.dailydials.SKIP_DAY";
    static final String ACTION_OPEN_DAY = "ca.fieldsa.dailydials.OPEN_DAY";

    static final int NUDGE_AFTER_MINUTES = 120;
    static final int SNOOZE_MINUTES = 60;

    private static final int[] BUTTONS = {R.id.m0, R.id.m1, R.id.m2, R.id.m3, R.id.m4, R.id.m5};
    /** Candy colours, worst → best. */
    private static final int[] COLOURS = {R.drawable.mood_0, R.drawable.mood_1, R.drawable.mood_2, R.drawable.mood_3, R.drawable.mood_4, R.drawable.mood_5};

    // ---- scheduling

    /** Arms the alarm for the next reminder, honouring the chosen days, weekend time and pause. */
    static void schedule(Context c) {
        Store store = new Store(c);
        long when = nextReminder(store, System.currentTimeMillis());
        PendingIntent pi = broadcast(c, ACTION_REMIND, 0);
        AlarmManager am = c.getSystemService(AlarmManager.class);
        if (when < 0) am.cancel(pi);
        else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, pi);
    }

    /** The next reminder time after {@code now}, or -1 if none (no days chosen, or paused indefinitely). */
    static long nextReminder(Store store, long now) {
        long paused = store.pausedUntil();
        if (paused == -1 || store.days() == 0) return -1;
        long after = Math.max(now + 1000, paused);
        for (int i = 0; i <= 8; i++) {
            Calendar day = Calendar.getInstance();
            day.setTimeInMillis(now);
            day.add(Calendar.DAY_OF_YEAR, i);
            int dow = day.get(Calendar.DAY_OF_WEEK); // Sunday = 1 … Saturday = 7
            int bit = dow == Calendar.SUNDAY ? 6 : dow - Calendar.MONDAY; // Monday = 0 … Sunday = 6
            if ((store.days() & (1 << bit)) == 0) continue;
            boolean weekend = dow == Calendar.SATURDAY || dow == Calendar.SUNDAY;
            boolean useWeekend = weekend && store.weekendOn();
            day.set(Calendar.HOUR_OF_DAY, useWeekend ? store.weekendHour() : store.hour());
            day.set(Calendar.MINUTE, useWeekend ? store.weekendMinute() : store.minute());
            day.set(Calendar.SECOND, 0);
            day.set(Calendar.MILLISECOND, 0);
            if (day.getTimeInMillis() >= after) return day.getTimeInMillis();
        }
        // Paused for longer than a week: try again from the end of the pause.
        return paused > now ? nextReminder(store, paused) : -1;
    }

    /** One more reminder later the same evening (the follow-up nudge or "Remind me in 1 hour"). */
    static void scheduleNudge(Context c, int minutes) {
        long when = System.currentTimeMillis() + minutes * 60_000L;
        c.getSystemService(AlarmManager.class)
                .setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, broadcast(c, ACTION_NUDGE, 1));
    }

    static void cancelNudge(Context c) {
        c.getSystemService(AlarmManager.class).cancel(broadcast(c, ACTION_NUDGE, 1));
    }

    // ---- the notification

    /**
     * Should a reminder show today? Yes while any notification dial is still unanswered
     * (a morning weight alone doesn't count), unless the person tapped "Skip today".
     */
    static boolean wanted(Store store) {
        String today = Store.today();
        return !today.equals(store.skippedDay()) && nextUnanswered(store, today, 0) >= 0;
    }

    /** The first notification dial at or after {@code from} with no value for that day, or -1. */
    static int nextUnanswered(Store store, String date, int from) {
        List<JSONObject> dials = store.notificationDials();
        JSONObject e = store.get(date);
        for (int i = Math.max(0, from); i < dials.size(); i++) {
            if (!Store.hasValue(e, dials.get(i).optString("key"))) return i;
        }
        return -1;
    }

    /**
     * Shows the notification asking for notification dial {@code step}.
     * {@code opening}: the first card of the evening (it alerts, and offers snooze / skip today).
     * {@code nudge}: the later, gentler wording.
     */
    static void showStep(Context c, String date, int step, boolean nudge, boolean opening) {
        Store store = new Store(c);
        List<JSONObject> dials = store.notificationDials();
        if (step < 0 || step >= dials.size()) return;
        JSONObject m = dials.get(step);
        String key = m.optString("key");
        String name = m.optString("name", key);
        boolean highIsGood = m.optBoolean("high", true);
        RemoteViews small = new RemoteViews(c.getPackageName(), R.layout.notification_mood);
        RemoteViews big = new RemoteViews(c.getPackageName(), R.layout.notification_mood_big);

        String title = nudge ? "Still time for today's check-in"
                : opening && "mood".equals(key) ? "How's your mood today?"
                : name + "?";
        String scale = "0 none · 5 " + (highIsGood ? "good" : "bad");
        big.setTextViewText(R.id.title, title);
        big.setTextViewText(R.id.scale, scale);

        for (int n = 0; n < BUTTONS.length; n++) {
            int colour = highIsGood ? n : 5 - n; // green always means a good day
            PendingIntent pi = answer(c, date, step, key, n);
            for (RemoteViews v : new RemoteViews[]{small, big}) {
                v.setInt(BUTTONS[n], "setBackgroundResource", COLOURS[colour]);
                v.setOnClickPendingIntent(BUTTONS[n], pi);
            }
        }

        Notification.Builder b = builder(c, store)
                .setSubText(name + " · " + (step + 1) + " of " + dials.size())
                .setContentTitle(title)
                .setContentText(scale)
                .setStyle(new Notification.DecoratedCustomViewStyle())
                .setCustomContentView(small)
                .setCustomBigContentView(big)
                .setContentIntent(openDay(c, date, 98))
                .setOnlyAlertOnce(!opening)
                .setAutoCancel(true);
        if (opening) {
            b.addAction(action(c, "Remind me in 1 hour", broadcast(c, ACTION_SNOOZE, 2)));
            b.addAction(action(c, "Skip today", broadcast(c, ACTION_SKIP_DAY, 3)));
        } else {
            b.addAction(action(c, "Skip this one", answer(c, date, step, key, -1)));
            b.addAction(action(c, "Finish in app", openDay(c, date, 97)));
        }
        nm(c).notify(NOTIFICATION_ID, b.build());
    }

    /** The last card: what was saved, with a way to add a note. Clears itself after 15 minutes. */
    static void showDone(Context c, String date) {
        Store store = new Store(c);
        JSONObject e = store.get(date);
        StringBuilder sum = new StringBuilder();
        List<JSONObject> dials = store.notificationDials();
        for (int i = 0; i < dials.size(); i++) {
            String key = dials.get(i).optString("key");
            if (i > 0) sum.append(" · ");
            sum.append(dials.get(i).optString("name", key)).append(' ');
            sum.append(Store.hasValue(e, key) ? String.valueOf(e.optInt(key)) : "–");
        }
        Notification n = builder(c, store)
                .setContentTitle("Check-in saved")
                .setContentText(sum)
                .setStyle(new Notification.BigTextStyle().bigText(sum))
                .setContentIntent(openDay(c, date, 98))
                .addAction(action(c, "Add a note", openDay(c, date, 96)))
                .setOnlyAlertOnce(true)
                .setAutoCancel(true)
                .setTimeoutAfter(15 * 60_000L)
                .build();
        nm(c).notify(NOTIFICATION_ID, n);
    }

    static void cancel(Context c) {
        nm(c).cancel(NOTIFICATION_ID);
    }

    // ---- helpers

    private static Notification.Builder builder(Context c, Store store) {
        return new Notification.Builder(c, channel(c, store.alert()))
                .setSmallIcon(R.drawable.ic_notif)
                .setColor(0xFF66BB57)
                .setShowWhen(true);
    }

    /**
     * Android fixes a channel's sound and vibration once it exists, so each alert style gets its own channel.
     * Only the chosen one is kept, so the phone's settings list one "Daily check-in reminder".
     */
    private static String channel(Context c, String alert) {
        NotificationManager nm = nm(c);
        nm.deleteNotificationChannel("daily"); // the single channel from the first version
        String id = "daily_" + alert;
        for (String other : new String[]{"daily_silent", "daily_vibrate", "daily_sound"}) {
            if (!other.equals(id)) nm.deleteNotificationChannel(other);
        }
        NotificationChannel ch = new NotificationChannel(id, "Daily check-in reminder", NotificationManager.IMPORTANCE_DEFAULT);
        ch.setDescription("The evening reminder with the check-in buttons");
        if ("sound".equals(alert)) {
            ch.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
                    new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION).build());
            ch.enableVibration(true);
        } else {
            ch.setSound(null, null);
            ch.enableVibration("vibrate".equals(alert));
        }
        nm.createNotificationChannel(ch);
        return id;
    }

    private static NotificationManager nm(Context c) {
        return c.getSystemService(NotificationManager.class);
    }

    private static Notification.Action action(Context c, String label, PendingIntent pi) {
        return new Notification.Action.Builder(null, label, pi).build();
    }

    private static PendingIntent broadcast(Context c, String action, int code) {
        Intent i = new Intent(c, ReminderReceiver.class).setAction(action);
        return PendingIntent.getBroadcast(c, code, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /** A number tapped (or -1 for "Skip this one") on notification dial {@code step}, which saves to {@code key}. */
    private static PendingIntent answer(Context c, String date, int step, String key, int value) {
        Intent i = new Intent(c, ReminderReceiver.class)
                .setAction(ACTION_ANSWER)
                .putExtra("date", date)
                .putExtra("step", step)
                .putExtra("key", key)
                .putExtra("value", value);
        return PendingIntent.getBroadcast(c, 100 + step * 10 + value + 1, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private static PendingIntent openDay(Context c, String date, int code) {
        Intent i = new Intent(c, MainActivity.class)
                .setAction(ACTION_OPEN_DAY)
                .putExtra("date", date)
                .setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(c, code, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }
}
