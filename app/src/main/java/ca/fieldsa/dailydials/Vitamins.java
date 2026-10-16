package ca.fieldsa.dailydials;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;

import org.json.JSONObject;

import java.util.Calendar;

/**
 * The daily multivitamin reminder: at the chosen time (12:15 by default) with Done and Snooze 1 hr,
 * then again at 6 PM and a last time at 7 PM if it still isn't answered. The answer is saved on the day
 * as "vitamins": 1 = taken, 0 = "Not today".
 */
final class Vitamins {
    static final int NOTIFICATION_ID = 2;
    static final String KEY = "vitamins";
    static final String ACTION_REMIND = "ca.fieldsa.dailydials.VIT_REMIND";
    static final String ACTION_DONE = "ca.fieldsa.dailydials.VIT_DONE";
    static final String ACTION_SNOOZE = "ca.fieldsa.dailydials.VIT_SNOOZE";
    static final String ACTION_SKIP = "ca.fieldsa.dailydials.VIT_SKIP";
    static final int SNOOZE_MINUTES = 60;
    /** Follow-ups when it still isn't answered: 6 PM, then a last one at 7 PM. */
    private static final int[][] FOLLOW_UPS = {{18, 0}, {19, 0}};

    static boolean answered(Store store, String date) {
        JSONObject e = store.get(date);
        return e != null && e.has(KEY) && !e.isNull(KEY);
    }

    /** Arms the next reminder: today's next slot if today isn't answered yet, else tomorrow's first. */
    static void schedule(Context c) {
        Store store = new Store(c);
        AlarmManager am = c.getSystemService(AlarmManager.class);
        PendingIntent pi = broadcast(c, ACTION_REMIND, 20);
        if (!store.vitOn()) {
            am.cancel(pi);
            am.cancel(broadcast(c, ACTION_REMIND, 21));
            cancel(c);
            return;
        }
        long now = System.currentTimeMillis();
        boolean doneToday = answered(store, Store.today());
        for (int day = 0; day <= 1; day++) {
            if (day == 0 && doneToday) continue;
            int[][] slots = {{store.vitHour(), store.vitMinute()}, FOLLOW_UPS[0], FOLLOW_UPS[1]};
            int first = store.vitHour() * 60 + store.vitMinute();
            for (int[] s : slots) {
                if (s != slots[0] && s[0] * 60 + s[1] <= first) continue; // a follow-up only after the first reminder
                Calendar t = Calendar.getInstance();
                t.add(Calendar.DAY_OF_YEAR, day);
                t.set(Calendar.HOUR_OF_DAY, s[0]);
                t.set(Calendar.MINUTE, s[1]);
                t.set(Calendar.SECOND, 0);
                t.set(Calendar.MILLISECOND, 0);
                if (t.getTimeInMillis() > now + 1000) {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, t.getTimeInMillis(), pi);
                    return;
                }
            }
        }
    }

    /** An alarm went off (on time or after a snooze): show it unless today is already answered. */
    static void remind(Context c) {
        Store store = new Store(c);
        if (store.vitOn() && !answered(store, Store.today())) {
            int h = Calendar.getInstance().get(Calendar.HOUR_OF_DAY);
            show(c, h >= FOLLOW_UPS[0][0]);
        }
        schedule(c);
    }

    static void snooze(Context c) {
        cancel(c);
        long when = System.currentTimeMillis() + SNOOZE_MINUTES * 60_000L;
        c.getSystemService(AlarmManager.class).setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, broadcast(c, ACTION_REMIND, 21));
    }

    /** Saves today's answer (1 taken, 0 not today) and stops the rest of today's reminders. */
    static void answer(Context c, int value) {
        new Store(c).setValue(Store.today(), KEY, value);
        cancel(c);
        c.getSystemService(AlarmManager.class).cancel(broadcast(c, ACTION_REMIND, 21));
        schedule(c);
    }

    /** Called when the app saves a day: if today got answered there, clear the notification and pending alarms. */
    static void onSaved(Context c, String date) {
        if (!date.equals(Store.today()) || !answered(new Store(c), date)) return;
        cancel(c);
        c.getSystemService(AlarmManager.class).cancel(broadcast(c, ACTION_REMIND, 21));
        schedule(c);
    }

    static void show(Context c, boolean followUp) {
        Notification.Builder b = new Notification.Builder(c, channel(c))
                .setSmallIcon(R.drawable.ic_notif_vit)
                .setColor(0xFF66BB57)
                .setShowWhen(true)
                .setContentTitle("Take multivitamins")
                .setSubText(followUp ? "not marked yet" : null)   // one line: the follow-ups just add a note beside the app name
                .setContentIntent(PendingIntent.getActivity(c, 30, new Intent(c, MainActivity.class), PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT))
                .setAutoCancel(true)
                .addAction(action("Done", broadcast(c, ACTION_DONE, 22)))
                .addAction(action("Snooze 1 hr", broadcast(c, ACTION_SNOOZE, 23)));
        if (followUp) b.addAction(action("Not today", broadcast(c, ACTION_SKIP, 24)));
        c.getSystemService(NotificationManager.class).notify(NOTIFICATION_ID, b.build());
    }

    static void cancel(Context c) {
        c.getSystemService(NotificationManager.class).cancel(NOTIFICATION_ID);
    }

    private static String channel(Context c) {
        NotificationChannel ch = new NotificationChannel("vitamins", "Multivitamin reminder", NotificationManager.IMPORTANCE_DEFAULT);
        ch.setDescription("Midday reminder to take your multivitamins, with follow-ups at 6 and 7 PM");
        c.getSystemService(NotificationManager.class).createNotificationChannel(ch);
        return "vitamins";
    }

    private static Notification.Action action(String label, PendingIntent pi) {
        return new Notification.Action.Builder(null, label, pi).build();
    }

    private static PendingIntent broadcast(Context c, String action, int code) {
        Intent i = new Intent(c, ReminderReceiver.class).setAction(action);
        return PendingIntent.getBroadcast(c, code, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }
}
