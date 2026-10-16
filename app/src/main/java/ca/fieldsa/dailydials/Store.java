package ca.fieldsa.dailydials;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

/** Everything is kept on the phone first; Sync copies it to the Google Sheet. */
final class Store {
    private final SharedPreferences entries;
    private final SharedPreferences pending;
    private final SharedPreferences settings;
    private final Context context;

    Store(Context c) {
        context = c.getApplicationContext();
        entries = c.getSharedPreferences("entries", Context.MODE_PRIVATE);
        pending = c.getSharedPreferences("pending", Context.MODE_PRIVATE);
        settings = c.getSharedPreferences("settings", Context.MODE_PRIVATE);
    }

    /** Hours after midnight that still count as the previous day (a 1 AM check-in fills in yesterday). */
    static final int DAY_STARTS_AT_HOUR = 4;

    static String today() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US)
                .format(new Date(System.currentTimeMillis() - DAY_STARTS_AT_HOUR * 3600_000L));
    }

    static String nowIso() {
        return new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ssXXX", Locale.US).format(new Date());
    }

    String allJson() {
        JSONObject all = new JSONObject();
        for (Map.Entry<String, ?> e : entries.getAll().entrySet()) {
            try {
                all.put(e.getKey(), new JSONObject(String.valueOf(e.getValue())));
            } catch (JSONException ignored) {
            }
        }
        return all.toString();
    }

    JSONObject get(String date) {
        String s = entries.getString(date, null);
        if (s == null) return null;
        try {
            return new JSONObject(s);
        } catch (JSONException e) {
            return null;
        }
    }

    void put(String date, JSONObject entry, boolean needsSync) {
        entries.edit().putString(date, entry.toString()).apply();
        if (needsSync) pending.edit().putBoolean(date, true).apply();
    }

    boolean hasMood(String date) {
        JSONObject e = get(date);
        return e != null && e.has("mood") && !e.isNull("mood");
    }

    /** Saves one dial (mood, pain, activity, …) for a day, keeping the others. */
    void setValue(String date, String key, int value) {
        JSONObject e = get(date);
        if (e == null) e = new JSONObject();
        try {
            e.put(key, value);
            e.put("date", date);
            e.put("updatedAt", nowIso());
        } catch (JSONException ignored) {
        }
        put(date, e, true);
    }

    // ---- indicators (the dials), editable in the app

    /** The indicator list as JSON: the edited one, or the defaults in assets/indicators.json. */
    String indicatorsJson() {
        String saved = settings.getString("indicators", null);
        if (saved != null) return saved;
        try (InputStream in = context.getAssets().open("indicators.json")) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[4096];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return out.toString(StandardCharsets.UTF_8.name());
        } catch (IOException e) {
            return "[]";
        }
    }

    void setIndicators(String json) {
        settings.edit().putString("indicators", json).apply();
    }

    /** All indicators, removed ones included (they have "hidden": true). */
    List<JSONObject> indicators() {
        List<JSONObject> out = new ArrayList<>();
        try {
            JSONArray a = new JSONArray(indicatorsJson());
            for (int i = 0; i < a.length(); i++) out.add(a.getJSONObject(i));
        } catch (JSONException ignored) {
        }
        return out;
    }

    /** The 0–5 dials that appear in the evening notification, in order. */
    List<JSONObject> notificationDials() {
        List<JSONObject> out = new ArrayList<>();
        for (JSONObject m : indicators()) {
            if ("scale".equals(m.optString("kind")) && m.optBoolean("notif") && !m.optBoolean("hidden")) out.add(m);
        }
        return out;
    }

    static boolean hasValue(JSONObject e, String key) {
        return e != null && e.has(key) && !e.isNull(key);
    }

    /**
     * For numbers marked "carry" (weight): any earlier day that has an entry but no value gets the
     * last value actually entered, with "<key>_carried": 1 so the sheet shows it was carried forward.
     * Today is left alone until it's over. Returns true if anything changed.
     */
    boolean carryForward() {
        boolean changed = false;
        String today = today();
        for (JSONObject m : indicators()) {
            if (!"number".equals(m.optString("kind")) || !m.optBoolean("carry") || m.optBoolean("hidden")) continue;
            String key = m.optString("key");
            String flag = key + "_carried";
            Double last = null;
            for (String date : new TreeSet<>(entries.getAll().keySet())) {
                if (date.compareTo(today) >= 0) break;
                JSONObject e = get(date);
                if (e == null) continue;
                boolean carried = e.optInt(flag, 0) == 1;
                if (hasValue(e, key) && !carried) {
                    last = e.optDouble(key);
                    continue;
                }
                if (last == null) continue;
                if (carried && hasValue(e, key) && e.optDouble(key) == last) continue;
                try {
                    e.put(key, last);
                    e.put(flag, 1);
                    e.put("updatedAt", nowIso());
                } catch (JSONException ignored) {
                }
                put(date, e, true);
                changed = true;
            }
        }
        return changed;
    }

    Set<String> pendingDates() {
        return new HashSet<>(pending.getAll().keySet());
    }

    void clearPending(String date) {
        pending.edit().remove(date).apply();
    }

    /** Marks a day as synced only if it hasn't changed since it was sent (a change made mid-sync stays pending). */
    synchronized void clearPendingIfSame(String date, String sentJson) {
        JSONObject now = get(date);
        if (now == null || sentJson == null || now.toString().equals(sentJson)) pending.edit().remove(date).apply();
    }

    String url() { return settings.getString("url", ""); }
    int hour() { return settings.getInt("hour", 19); }
    int minute() { return settings.getInt("minute", 0); }
    String status() { return settings.getString("status", ""); }

    void setStatus(String s) {
        settings.edit().putString("status", s).apply();
    }

    // Reminder settings
    /** Days the reminder runs, one bit per day: bit 0 = Monday … bit 6 = Sunday. */
    int days() { return settings.getInt("days", 0b1111111); }
    boolean weekendOn() { return settings.getBoolean("weekendOn", false); }
    int weekendHour() { return settings.getInt("weekendHour", 10); }
    int weekendMinute() { return settings.getInt("weekendMinute", 0); }
    boolean nudge() { return settings.getBoolean("nudge", true); }
    // Multivitamin reminder
    boolean vitOn() { return settings.getBoolean("vitOn", true); }
    int vitHour() { return settings.getInt("vitHour", 12); }
    int vitMinute() { return settings.getInt("vitMinute", 15); }
    /** "silent", "vibrate" or "sound". */
    String alert() { return settings.getString("alert", "silent"); }
    /** No reminders before this time (milliseconds); 0 = not paused, -1 = until turned back on. */
    long pausedUntil() { return settings.getLong("pausedUntil", 0); }
    /** The day the person tapped "Skip today". */
    String skippedDay() { return settings.getString("skippedDay", ""); }

    void saveSettings(JSONObject o) {
        settings.edit()
                .putInt("hour", o.optInt("hour", 19))
                .putInt("minute", o.optInt("minute", 0))
                .putString("url", o.optString("url", "").trim())
                .putInt("days", o.optInt("days", 0b1111111))
                .putBoolean("weekendOn", o.optBoolean("weekendOn", false))
                .putInt("weekendHour", o.optInt("weekendHour", 10))
                .putInt("weekendMinute", o.optInt("weekendMinute", 0))
                .putBoolean("nudge", o.optBoolean("nudge", true))
                .putString("alert", o.optString("alert", "silent"))
                .putBoolean("vitOn", o.optBoolean("vitOn", vitOn()))
                .putInt("vitHour", o.optInt("vitHour", vitHour()))
                .putInt("vitMinute", o.optInt("vitMinute", vitMinute()))
                .apply();
    }

    void setPausedUntil(long millis) { settings.edit().putLong("pausedUntil", millis).apply(); }
    void setSkippedDay(String date) { settings.edit().putString("skippedDay", date).apply(); }

    /** Fills a JSON object with every setting, for the settings screen. */
    void settingsInto(JSONObject o) throws JSONException {
        o.put("hour", hour());
        o.put("minute", minute());
        o.put("url", url());
        o.put("status", status());
        o.put("days", days());
        o.put("weekendOn", weekendOn());
        o.put("weekendHour", weekendHour());
        o.put("weekendMinute", weekendMinute());
        o.put("nudge", nudge());
        o.put("alert", alert());
        o.put("pausedUntil", pausedUntil());
        o.put("vitOn", vitOn());
        o.put("vitHour", vitHour());
        o.put("vitMinute", vitMinute());
    }
}
