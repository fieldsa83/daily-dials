package ca.fieldsa.dailydials;

import android.content.Context;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.DateFormat;
import java.util.Date;
import java.util.Iterator;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Sends unsynced days to the Apps Script link, then pulls the whole sheet back. */
final class Sync {
    interface Done {
        void done(String status, boolean changed);
    }

    private static final ExecutorService EXEC = Executors.newSingleThreadExecutor();

    static void run(Context context, Done done) {
        final Context app = context.getApplicationContext();
        EXEC.execute(() -> {
            Store store = new Store(app);
            String url = store.url();
            String status;
            boolean changed = store.carryForward();
            if (url.isEmpty()) {
                status = "Not connected to a sheet yet. Entries are saved on this phone.";
            } else {
                try {
                    // Up to 300 days per request, so an imported history goes up in a few calls.
                    // An older sheet script without "saveMany" answers "missing date"; then it's one day per request.
                    java.util.List<String> dates = new java.util.ArrayList<>(store.pendingDates());
                    java.util.Collections.sort(dates);
                    boolean batches = dates.size() > 1;
                    for (int i = 0; i < dates.size(); ) {
                        if (batches) {
                            org.json.JSONArray list = new org.json.JSONArray();
                            java.util.List<String> sent = new java.util.ArrayList<>();
                            java.util.Map<String, String> sentAs = new java.util.HashMap<>();
                            for (int j = i; j < dates.size() && sent.size() < 300; j++) {
                                JSONObject entry = store.get(dates.get(j));
                                if (entry != null) { list.put(entry); sentAs.put(dates.get(j), entry.toString()); }
                                sent.add(dates.get(j));
                            }
                            JSONObject body = new JSONObject();
                            body.put("action", "saveMany");
                            body.put("entries", list);
                            JSONObject res = parse(http(url, body.toString()));
                            if (res.optBoolean("ok")) {
                                for (String d : sent) store.clearPendingIfSame(d, sentAs.get(d));
                                i += sent.size();
                                continue;
                            }
                            if (!"missing date".equals(res.optString("error"))) throw new IOException(res.optString("error", "the sheet refused the entries"));
                            batches = false; // older script: fall back to one at a time
                        }
                        String date = dates.get(i++);
                        JSONObject entry = store.get(date);
                        if (entry == null) {
                            store.clearPending(date);
                            continue;
                        }
                        JSONObject body = new JSONObject();
                        body.put("action", "save");
                        body.put("entry", entry);
                        String sentJson = entry.toString();
                        JSONObject res = parse(http(url, body.toString()));
                        if (!res.optBoolean("ok")) throw new IOException(res.optString("error", "the sheet refused the entry"));
                        store.clearPendingIfSame(date, sentJson);
                    }
                    JSONObject res = parse(http(withParam(url, "action=all"), null));
                    if (!res.optBoolean("ok")) throw new IOException(res.optString("error", "the sheet refused the request"));
                    JSONObject remote = res.optJSONObject("entries");
                    if (remote != null) {
                        Set<String> stillPending = store.pendingDates();
                        Iterator<String> it = remote.keys();
                        while (it.hasNext()) {
                            String date = it.next();
                            if (stillPending.contains(date)) continue;
                            JSONObject r = remote.getJSONObject(date);
                            JSONObject l = store.get(date);
                            // keep a phone entry that was changed more recently than the sheet's copy
                            if (l != null && l.optString("updatedAt").compareTo(r.optString("updatedAt")) > 0) { if (!l.toString().equals(r.toString())) store.put(date, l, true); continue; }
                            if (l == null || !l.toString().equals(r.toString())) {
                                store.put(date, r, false);
                                changed = true;
                            }
                        }
                    }
                    status = "Synced with your sheet at " + DateFormat.getTimeInstance(DateFormat.SHORT).format(new Date()) + ".";
                } catch (Exception e) {
                    status = "Couldn't reach your sheet (" + e.getMessage() + "). Entries are safe on this phone and will sync next time.";
                }
            }
            store.setStatus(status);
            if (done != null) done.done(status, changed);
        });
    }

    private static JSONObject parse(String text) throws IOException {
        try {
            return new JSONObject(text);
        } catch (JSONException e) {
            throw new IOException("the link didn't answer with sheet data; check it was deployed with access set to Anyone");
        }
    }

    private static String withParam(String url, String param) {
        return url + (url.contains("?") ? "&" : "?") + param;
    }

    private static String http(String url, String body) throws IOException {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(15000);
        c.setReadTimeout(30000);
        c.setInstanceFollowRedirects(true);
        try {
            if (body != null) {
                c.setDoOutput(true);
                c.setRequestMethod("POST");
                c.setRequestProperty("Content-Type", "text/plain;charset=utf-8");
                try (OutputStream out = c.getOutputStream()) {
                    out.write(body.getBytes(StandardCharsets.UTF_8));
                }
            }
            int code = c.getResponseCode();
            if (code >= 400) throw new IOException("error " + code);
            try (InputStream in = c.getInputStream()) {
                ByteArrayOutputStream buf = new ByteArrayOutputStream();
                byte[] b = new byte[8192];
                int n;
                while ((n = in.read(b)) > 0) buf.write(b, 0, n);
                return buf.toString("UTF-8");
            }
        } finally {
            c.disconnect();
        }
    }
}
