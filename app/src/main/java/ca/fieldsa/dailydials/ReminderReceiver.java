package ca.fieldsa.dailydials;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Handles the reminder alarms and every button in the notification.
 * Also re-arms the alarm after a reboot or an app update.
 */
public class ReminderReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent intent) {
        Store store = new Store(c);
        String action = intent.getAction() == null ? "" : intent.getAction();
        String today = Store.today();
        switch (action) {
            case Reminder.ACTION_REMIND:
                if (Reminder.wanted(store)) {
                    Reminder.showStep(c, today, Reminder.nextUnanswered(store, today, 0), false, true);
                    if (store.nudge()) Reminder.scheduleNudge(c, Reminder.NUDGE_AFTER_MINUTES);
                }
                Reminder.schedule(c);
                break;

            case Reminder.ACTION_NUDGE:
                if (Reminder.wanted(store)) Reminder.showStep(c, today, Reminder.nextUnanswered(store, today, 0), true, true);
                break;

            case Reminder.ACTION_SNOOZE:
                Reminder.cancel(c);
                Reminder.scheduleNudge(c, Reminder.SNOOZE_MINUTES);
                break;

            case Reminder.ACTION_SKIP_DAY:
                store.setSkippedDay(today);
                Reminder.cancel(c);
                Reminder.cancelNudge(c);
                break;

            case Reminder.ACTION_ANSWER: {
                String date = intent.getStringExtra("date");
                int step = intent.getIntExtra("step", -1);
                String key = intent.getStringExtra("key");
                int value = intent.getIntExtra("value", -1);
                if (date == null || key == null || step < 0) break;
                if (value >= 0 && value <= 5) store.setValue(date, key, value);
                Reminder.cancelNudge(c);
                int next = Reminder.nextUnanswered(store, date, step + 1);
                if (next >= 0) {
                    Reminder.showStep(c, date, next, false, false);
                } else {
                    Reminder.showDone(c, date);
                    PendingResult pr = goAsync();
                    Sync.run(c, (status, changed) -> pr.finish());
                }
                break;
            }

            case Vitamins.ACTION_REMIND:
                Vitamins.remind(c);
                break;

            case Vitamins.ACTION_SNOOZE:
                Vitamins.snooze(c);
                break;

            case Vitamins.ACTION_DONE:
            case Vitamins.ACTION_SKIP: {
                Vitamins.answer(c, Vitamins.ACTION_DONE.equals(action) ? 1 : 0);
                PendingResult pr = goAsync();
                Sync.run(c, (status, changed) -> pr.finish());
                break;
            }

            default: // boot, app update
                Reminder.schedule(c);
                Vitamins.schedule(c);
        }
    }
}
