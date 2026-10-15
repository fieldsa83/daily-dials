# Daily Dials

A personal Android app for a daily check-in: mood, back pain, activity, anxiety, sleep, other pain and driving, each 0–5, plus a note.

- At your reminder time (7 PM by default) a notification asks for your mood, 0 to 5. Each tap saves that dial and the same notification moves on to the next one, so you can do the whole check-in without opening the app. Green always means a good day: the colours flip for pain, anxiety and driving. "Finish in app" or "Add a note" opens the app on that day.
- Under **Settings & sync** you can pick the reminder days, set a different weekend time, get a second nudge 2 hours later if you haven't answered, choose silent, vibrate or sound, and pause reminders. The first card also has "Remind me in 1 hour" and "Skip today".
- A check-in before 4 AM counts for the previous day. The notification keeps coming until every notification dial is answered, so a morning weigh-in alone doesn't stop it.
- **Weight** is a ruler you drag sideways; each small tick is 0.1 lb and it opens on your last weight. If a day has a check-in but no weight, the last weight is carried forward and the sheet's `weight_carried` column shows 1.
- **Indicators** (a panel in the app) lets you rename, reorder, remove and add indicators: 0–5 dials, or numbers like weight. Removing only hides one; its past values stay. The defaults are in `app/src/main/assets/indicators.json`.
- Entries are saved on the phone right away and copied to a Google Sheet whenever there's a connection.

## Install on your phone

1. On the phone, open **https://github.com/fieldsa83/daily-dials/releases/latest/download/DailyDials.apk**
2. Open the downloaded file. Android asks you to allow installs from your browser once; allow it, then tap **Install**.
3. Open Daily Dials and allow notifications.

Every change pushed to this repository builds a new version at the same link. Installing it updates the app and keeps your entries.

## Connect the Google Sheet

1. Create a blank Google Sheet (any name).
2. **Extensions → Apps Script**. Delete what's there and paste in `apps-script/Code.gs`.
3. Change `TOKEN` near the top to a long random password. Save.
4. Choose `setup` in the function menu and click **Run**. Approve the permissions (it's your own script).
5. **Deploy → New deployment → Web app**. Execute as: **Me**. Who has access: **Anyone**. Deploy and copy the web app link.
6. In the app, open **Settings & sync** and paste the link with your token added on the end:
   `https://script.google.com/macros/s/…/exec?token=YOUR-TOKEN`
   Tap **Save settings**, then **Sync now**.

"Anyone" is needed because the app doesn't sign in to Google. The token is what keeps others out, so keep the link private.

The sheet gets one row per day with the columns `date, mood, back_pain, activity, anxiety, sleep, other_pain, driving, note, updated_at`. Indicators you add (and weight) get a new column at the end the first time they have a value.

**Updating the script:** after changing `Code.gs`, paste the new version into Apps Script, then **Deploy → Manage deployments → ✎ Edit → Version: New version → Deploy**. The link stays the same.

## Change the code

`app/src/main/assets/index.html` is the screen. The Java files in `app/src/main/java/ca/fieldsa/dailydials/` handle storage, the reminder and sync.
