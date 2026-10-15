package ca.fieldsa.dailydials;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import org.json.JSONException;
import org.json.JSONObject;

/** Shows the Daily Dials page and connects it to phone storage, reminders and sync. */
public class MainActivity extends Activity {
    private WebView web;
    private Store store;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable syncSoon = this::syncNow;
    private String openDate; // a day to show once the page has loaded

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        store = new Store(this);
        if (savedInstanceState == null) openDate = dayToOpen(getIntent());

        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        web.addJavascriptInterface(new Bridge(), "DailyDials");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if ("file".equals(u.getScheme())) return false;
                startActivity(new Intent(Intent.ACTION_VIEW, u));
                return true;
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                if (openDate != null) showDay(openDate);
                openDate = null;
            }
        });
        setContentView(web);
        web.loadUrl("file:///android_asset/index.html");

        Reminder.schedule(this);
        if (Build.VERSION.SDK_INT >= 33
                && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, 1);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        String date = dayToOpen(intent);
        if (date != null) showDay(date);
    }

    @Override
    protected void onResume() {
        super.onResume();
        js("window.reloadEntries && window.reloadEntries(false)");
        syncNow();
    }

    /** "Finish in app" or "Add a note" in the notification: the day to open, or null. */
    private String dayToOpen(Intent intent) {
        if (intent == null || !Reminder.ACTION_OPEN_DAY.equals(intent.getAction())) return null;
        intent.setAction(Intent.ACTION_MAIN); // don't apply it twice
        Reminder.cancel(this);
        return intent.getStringExtra("date");
    }

    private void showDay(String date) {
        js("window.openDay && window.openDay(" + JSONObject.quote(date) + ")");
    }

    private void syncLater() {
        handler.removeCallbacks(syncSoon);
        handler.postDelayed(syncSoon, 2000);
    }

    private void syncNow() {
        Sync.run(this, (status, changed) -> js(
                "window.onSyncStatus && window.onSyncStatus(" + JSONObject.quote(status) + ");"
                        + (changed ? "window.reloadEntries && window.reloadEntries(false);" : "")));
    }

    private void js(String code) {
        runOnUiThread(() -> {
            if (web != null) web.evaluateJavascript(code, null);
        });
    }

    /** Methods the page calls as window.DailyDials.* */
    private class Bridge {
        /** A light click for each notch of the weight ruler. */
        @JavascriptInterface
        public void tick() {
            Vibrator v = (Vibrator) getSystemService(VIBRATOR_SERVICE);
            if (v == null || !v.hasVibrator()) return;
            // a firm, short click: the "heavy click" effect where the phone has it, else a 25 ms full-strength buzz
            if (Build.VERSION.SDK_INT >= 29) v.vibrate(VibrationEffect.createPredefined(VibrationEffect.EFFECT_HEAVY_CLICK));
            else v.vibrate(VibrationEffect.createOneShot(25, 255));
        }

        @JavascriptInterface
        public String getAll() {
            return store.allJson();
        }

        @JavascriptInterface
        public void save(String date, String json) {
            try {
                store.put(date, new JSONObject(json), true);
            } catch (JSONException e) {
                return;
            }
            if (date.equals(Store.today()) && Reminder.nextUnanswered(store, date, 0) < 0) Reminder.cancel(MainActivity.this);
            runOnUiThread(MainActivity.this::syncLater);
        }

        /** Many days at once (an import): {"2019-03-04": {...}, ...}. */
        @JavascriptInterface
        public void saveMany(String json) {
            try {
                JSONObject all = new JSONObject(json);
                java.util.Iterator<String> it = all.keys();
                while (it.hasNext()) {
                    String date = it.next();
                    store.put(date, all.getJSONObject(date), true);
                }
            } catch (JSONException e) {
                return;
            }
            runOnUiThread(MainActivity.this::syncLater);
        }

        @JavascriptInterface
        public String getIndicators() {
            return store.indicatorsJson();
        }

        @JavascriptInterface
        public void setIndicators(String json) {
            store.setIndicators(json);
        }

        @JavascriptInterface
        public String getSettings() {
            JSONObject o = new JSONObject();
            try {
                store.settingsInto(o);
                o.put("next", Reminder.nextReminder(store, System.currentTimeMillis()));
            } catch (JSONException ignored) {
            }
            return o.toString();
        }

        @JavascriptInterface
        public void setSettings(String json) {
            try {
                JSONObject o = new JSONObject(json);
                store.saveSettings(o);
            } catch (JSONException e) {
                return;
            }
            Reminder.schedule(MainActivity.this);
            runOnUiThread(MainActivity.this::syncNow);
        }

        @JavascriptInterface
        public void syncNow() {
            runOnUiThread(MainActivity.this::syncNow);
        }

        /** Pause reminders until this time in milliseconds; 0 resumes, -1 pauses until turned back on. */
        @JavascriptInterface
        public long pause(String until) {
            store.setPausedUntil(Long.parseLong(until));
            Reminder.cancelNudge(MainActivity.this);
            Reminder.schedule(MainActivity.this);
            return Reminder.nextReminder(store, System.currentTimeMillis());
        }

        @JavascriptInterface
        public void testReminder() {
            Store st = new Store(MainActivity.this);
            int step = Reminder.nextUnanswered(st, Store.today(), 0);
            Reminder.showStep(MainActivity.this, Store.today(), Math.max(step, 0), false, true);
        }
    }
}
