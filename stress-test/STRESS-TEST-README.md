# Stress test: command reference

All commands used for the API stress tests, in the order you need them. Copy and paste them into the Terminal inside VS Code. Where a command needs a value from you, it is written in angle brackets, for example `<survey ID>`.

**Never write a password into a file.** The scripts read the login from the terminal's memory, and you type it at a hidden prompt.

---

## 0. Quick map

| Step | What | Section |
|---|---|---|
| 1 | One-time setup: branch, tool, test account | 2 |
| 2 | Make the throwaway database copy (needed for tests that write data) | 3 |
| 3 | Start the backend in production mode and check which database it uses | 4 |
| 4 | Give the scripts a login | 5 |
| 5 | Run the tests | 6 |
| 6 | Check the results in the database | 7 |
| 7 | Clean up and commit | 8 and 9 |

**Which tests write data:**

| Script | Writes data? | Use which database |
|---|---|---|
| `run.js` (read endpoints) | No | Main local database or the copy |
| `form-conditional-test.js` | No | Either |
| `sync-test.js` | **Yes** | **Copy only** |
| `make-inject.js` + the Sync page (online/offline round) | **Yes** | **Copy only** |
| `injection-test.js` | **Yes** | **Copy only** |


---

## 1. Prerequisites (included for reference)

| Item | Check with |
|---|---|
| Postgres.app with PostgreSQL 17, open and running | `psql --version` (should print 17.x) |
| Node 22 | `node -v` |
| The project's dependencies installed | `npm ci` in `backend` and in `frontend` |
| The team's database restored as `punjab_industrial_survey` | `psql -l` |

Put Postgres.app's tools on the PATH (once), then open a new terminal window:

```bash
sudo mkdir -p /etc/paths.d
echo /Applications/Postgres.app/Contents/Versions/latest/bin | sudo tee /etc/paths.d/postgresapp
```

Restore the team's backup (a custom-format dump, even though the file ends in `.sql`):

```bash
createdb punjab_industrial_survey
pg_restore -d punjab_industrial_survey --no-owner --no-privileges -v "<full path to the backup file>"
```

Check free disk space (the write tests add fake photos of about 2 to 3 GB):

```bash
df -h /
```

---

## 2. One-time setup of the stress-test work

### 2.1 Git branch and folder

```bash
cd ~/Downloads/Nespak-Project/Project_1/Punjab_Industries/Code_base/punjab-surveyapp
git checkout main
git checkout -b api-stress-test
mkdir stress-test
cd stress-test
npm init -y
npm install autocannon
```

The scripts live in `stress-test/`: `run.js`, `sync-test.js`, `form-conditional-test.js`, `make-inject.js`, `injection-test.js`. Results are saved in `stress-test/results/`.

### 2.2 A local test account (surveyor)

The scripts log in as `stress-test-user`. Create it in the **main local database** (so the copy inherits it). Run the lines one at a time. `read -s` hides what you type; choose a made-up password, not a real one.

```bash
cd ~/Downloads/Nespak-Project/Project_1/Punjab_Industries/Code_base/punjab-surveyapp/backend
read -s "PW?Choose a password for the local test account: "
HASH=$(printf '%s' "$PW" | node -e "let i='';process.stdin.on('data',d=>i+=d);process.stdin.on('end',async()=>console.log(await require('bcrypt').hash(i.trimEnd(),12)))")
echo ${#HASH}
```

The `echo` must print `60`. Then create the account:

```bash
psql -d punjab_industrial_survey <<SQL
INSERT INTO users (username, full_name, password_hash, role_id, is_active)
SELECT 'stress-test-user', 'Stress Test User', '$HASH', id, true
FROM roles WHERE code = 'SURVEYOR';
SQL
unset PW HASH
```

It must print `INSERT 0 1`. This account exists only on your machine.

### 2.3 The template survey (needed by `sync-test.js`, `make-inject.js` and `injection-test.js`)

These scripts copy a real, valid saved draft. Make one:

1. Start the frontend (section 4.3) and sign in as `stress-test-user`.
2. Fill in every field marked **Required** in sections A to K (not the photo section L). Use realistic fake values. The database has rules, for example the establishment year must be between 1800 and 2100. Press **SAVE** (not Submit).
3. In Chrome press **Ctrl+Option+I**, open the **Console** tab. If Chrome asks, type `allow pasting` and press Enter first.
4. Paste this command and press Enter. It prints `Answers in the draft:` and a number:

```js
window.draftJson = await new Promise((res, rej) => { const r = indexedDB.open('survey-pwa'); r.onsuccess = () => { const q = r.result.transaction('offline_responses').objectStore('offline_responses').getAll(); q.onsuccess = () => res(JSON.stringify(q.result[0])); q.onerror = () => rej(q.error); }; r.onerror = () => rej(r.error); }); console.log('Answers in the draft:', JSON.parse(window.draftJson).answers.length);
```

5. Then, as a separate command:

```js
copy(window.draftJson)
```

6. In VS Code create `stress-test/template-draft.json`, paste with **Ctrl+V**, and save. Check that it is valid and has no stray text at the end:

```bash
cd ~/Downloads/Nespak-Project/Project_1/Punjab_Industries/Code_base/punjab-surveyapp/stress-test
node -e "JSON.parse(require('fs').readFileSync('template-draft.json','utf8')); console.log('JSON OK')"
tail -c 60 template-draft.json
```

It must print `JSON OK`, and the last characters should be `...Z"}`. The file holds the test account's ID, so **do not commit it**.

---

## 3. The throwaway database copy (keeps the real database safe)

The write tests (sync, injection, online/offline) add fake surveys, photos and accounts. To keep your real local database clean, they run against a **copy** with the same tables and data. The copy is a separate database inside the same Postgres.app server, so it costs only disk space. While the backend is pointed at the copy, nothing the tests do can change the original.

### 3.1 Make the copy

Nothing may be connected to the source database while it is copied: stop the backend, and disconnect or quit pgAdmin.

```bash
createdb -T punjab_industrial_survey punjab_stress_test
```

Check that the copy has the same data (the two unit counts must match):

```bash
psql -d punjab_industrial_survey -c "select count(*) as units from industrial_units;"
psql -d punjab_stress_test -c "select count(*) as units from industrial_units;"
```

If you cannot disconnect everything, copy through a dump file instead (standard commands, but not run during this project):

```bash
pg_dump -Fc -d punjab_industrial_survey -f ~/punjab_copy.dump
createdb punjab_stress_test
pg_restore -d punjab_stress_test --no-owner --no-privileges ~/punjab_copy.dump
rm ~/punjab_copy.dump
```

### 3.2 Point the backend at the copy

The backend takes its database name from `backend/.env`. A setting typed on the command line wins over the file, so the copy is used only when you start the backend with `DB_DATABASE=punjab_stress_test` (section 4.2). The `.env` file is never edited. The photo folder is switched the same way (`STORAGE_LOCAL_DIR=/tmp/stress-uploads`), so test photos stay out of the project's own `uploads` folder.

Safety rules:

- The startup line must read `Database -> punjab_stress_test@localhost:5432`. If it says `DATABASE_URL` instead of a database name, a `DATABASE_URL` line is overriding the setting. Stop with **Ctrl+C** and do not test until that is fixed.
- Run the check in section 4.4 before every write test.
- To go back to the real database, stop the backend and start it normally (section 4.2).

### 3.3 What the copy does and does not contain

- It is a **snapshot** from the moment you made it. Later changes to the real database do not appear in it.
- It has the same tables and all rows, including the users and the test account (if you created it before copying).
- Photo files are stored outside the database, in the photo folder, so they are **not** copied. The copy's photo folder starts empty.
- Its size equals your real data plus whatever fake surveys the tests add. With only a few real units, run `sync-test.js` (section 6.3) to add about 1,200 fake surveys and get a more realistic size.

### 3.4 Reset or refresh the copy

To get a clean copy again (a new snapshot, with all test data gone), stop the backend and disconnect pgAdmin, then:

```bash
dropdb punjab_stress_test
createdb -T punjab_industrial_survey punjab_stress_test
rm -rf /tmp/stress-uploads
```

### 3.5 Delete it when finished

See section 8.

---

## 4. Start the servers

### 4.1 Build the backend (after any code change)

```bash
cd ~/Downloads/Nespak-Project/Project_1/Punjab_Industries/Code_base/punjab-surveyapp/backend
npm run build
```

### 4.2 Run the backend in production mode

Production mode matters: in development mode the backend prints every SQL query, which slows it down. Stop the frontend and close Chrome first when you measure speed.

**Against the main local database** (read-only tests):

```bash
NODE_ENV=production node dist/main.js
```

**Against the throwaway copy** (all write tests; this is one long line):

```bash
DB_DATABASE=punjab_stress_test STORAGE_LOCAL_DIR=/tmp/stress-uploads NODE_ENV=production node dist/main.js
```

The tab stays busy while the server runs. Press **Ctrl+C** in that tab to stop it. The startup line `Database -> punjab_stress_test@localhost:5432` must name the copy before you run any write test.

### 4.3 Run the frontend (only for the online/offline round)

```bash
cd ~/Downloads/Nespak-Project/Project_1/Punjab_Industries/Code_base/punjab-surveyapp/frontend
npm run dev
```

Open `http://localhost:5173`. Stop it with **Ctrl+C**.

### 4.4 Safety checks (in a separate terminal tab)

Is the backend up? (`401` = up and asking for a login, `000` = nothing is answering):

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3002/auth/me
```

Which database is the running backend using? It must print `DB_DATABASE=punjab_stress_test` before any write test (if it prints nothing, it is using the main database):

```bash
ps eww -p $(lsof -nP -iTCP:3002 -sTCP:LISTEN -t) | tr ' ' '\n' | grep -E '^(DB_DATABASE|NODE_ENV)='
```

---

## 5. Give the scripts a login

Do this in the terminal tab where you run the scripts, in the `stress-test` folder. The values last only for that tab, so redo it in a new tab. Run each line on its own:

```bash
cd ~/Downloads/Nespak-Project/Project_1/Punjab_Industries/Code_base/punjab-surveyapp/stress-test
read "TEST_USERNAME?Username: "
read -s "TEST_PASSWORD?Password: "
export TEST_USERNAME TEST_PASSWORD
```

Type `stress-test-user` as the username and the password you chose in section 2.2.

---

## 6. Run the tests

### 6.1 Read endpoints (`run.js`)

Tests `/auth/me`, `/industrial-units`, `/industrial-units/:id`, `/survey-forms/active` and login at 10, 50, 100 and 200 connections. Takes about 6 to 8 minutes.

```bash
node run.js
```

Optional: `export DB_NOTE="text for the report's database line"` before running. Output: `results/report-<time>.md` and `results/raw-<time>.json`.

### 6.2 Form download as a returning device (`form-conditional-test.js`)

```bash
node form-conditional-test.js
```

Takes about 1.5 minutes. It first checks that the server answers `304` to a request with the form's ETag.

### 6.3 Full survey sync with photos (`sync-test.js`, writes data, copy only)

Each survey is 2 photo uploads plus one sync. A probe survey is sent first; if the server rejects it, the script stops and prints the server's message.

```bash
CONFIRM_COPY_DB=yes node sync-test.js
```

With realistic 2.5 MB photos (fewer surveys, lower load):

```bash
CONFIRM_COPY_DB=yes PHOTO_KB=2500 LEVELS=5,10,20 MAX_SURVEYS=100 node sync-test.js
```

Output: `results/sync-report-<time>.md`.

### 6.4 Injection and malformed input (`injection-test.js`, writes data, copy only)

About 86 checks: login, tokens and permissions, odd IDs, hostile text, broken sync and photo requests. Takes 1 to 2 minutes.

```bash
CONFIRM_COPY_DB=yes node injection-test.js
```

Output: a list printed to the terminal (copy it from the line starting `Totals:`) and `results/injection-report-<time>.md`.

### 6.5 Online/offline round (manual, copy only)

The Laptop has no rear camera, so the two required photos cannot be taken in the app. `make-inject.js` writes a snippet that puts a complete survey with two small test photos straight into Chrome's storage for the logged-in account.

1. Backend on the copy (section 4.2), frontend running (section 4.3), signed in as `stress-test-user`, and at least one saved draft in the app (the snippet copies the account ID from it).
2. Build the snippet (in the `stress-test` folder):

```bash
node make-inject.js
```

   For a survey that the database will reject (establishment year 10):

```bash
YEAR=10 OUT=browser-inject-bad-year.js node make-inject.js
```

3. Open the generated `browser-inject.js` (or `browser-inject-bad-year.js`) in VS Code, press **Ctrl+A**, **Ctrl+C**. In Chrome's **Console** (type `allow pasting` first if asked), paste and press Enter. It prints `Added survey ... Status: pending_sync`.
4. Press **Ctrl+R**, then open **Sync** in the app. It should say 1 response is ready to upload.
5. Chrome DevTools (**Cmd+Option+I**), **Network** tab: use the throttling dropdown to switch **Offline** or **No throttling**, and the **Clear** icon to empty the request list. Press **Sync Now** in the app.

What to try, and what was seen:

| Try | What to look for |
|---|---|
| Network set to Offline, open Sync | Banner "Offline", Sync Now disabled |
| Online, Sync Now | Two `photos` requests and one `sync` request, all successful; the survey shows SYNCED |
| Reset a synced survey to pending and sync again | Result `already synced` (reset command below) |
| Stop the backend (Ctrl+C), then Sync Now | Red error, surveys stay pending; restart the backend and sync again |
| Inject the bad-year survey and sync | The survey comes back `failed` with a database message; open it, fix the year, submit, sync |

Reset a survey to pending (Console; replace `<first 8 characters>` with the start of the survey ID):

```js
(async () => {
  const db = await new Promise((res, rej) => { const r = indexedDB.open('survey-pwa'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const all = await new Promise((res, rej) => { const q = db.transaction('offline_responses').objectStore('offline_responses').getAll(); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
  const row = all.find((r) => r.response_id.startsWith('<first 8 characters>'));
  if (!row) throw new Error('Survey not found');
  row.sync_status = 'pending_sync';
  await new Promise((res, rej) => { const tx = db.transaction('offline_responses', 'readwrite'); tx.objectStore('offline_responses').put(row); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  console.log('Set back to pending_sync:', row.response_id);
})();
```

Look at what the app has stored: DevTools > **Application** > **IndexedDB** > `survey-pwa` > `offline_responses`, then click the refresh arrow.

---

## 7. Check the results in the database

All of these only read data. Run them in a separate terminal tab.

Row counts after a write test:

```bash
psql -d punjab_stress_test -c "select (select count(*) from survey_responses) as responses, (select count(*) from industrial_units) as units, (select count(*) from survey_attachments) as photos, (select count(*) from duplicate_flags) as duplicates;"
```

The latest sync runs (how many surveys were sent, synced and rejected):

```bash
psql -d punjab_stress_test -c "select id, records_sent, records_synced, records_rejected, status from sync_log order by id desc limit 4;"
```

One survey, its photos and its files (replace `<first 8 characters>` with the start of the survey ID):

```bash
psql -d punjab_stress_test -c "select r.id, r.status, r.sync_status, u.name from survey_responses r join industrial_units u on u.id = r.unit_id where r.id::text like '<first 8 characters>%';"
psql -d punjab_stress_test -c "select count(*) as attachments from survey_attachments where response_id::text like '<first 8 characters>%';"
find /tmp/stress-uploads -path '*<first 8 characters>*' -type f
```

Photos uploaded but never attached to a survey (leftovers of rejected or repeated syncs):

```bash
psql -d punjab_stress_test -c "select count(*) as orphan_photo_rows from survey_photo_uploads;"
psql -d punjab_stress_test -c "select left(response_id::text, 8) as survey, count(*) as photo_rows, (select count(*) from survey_responses r where r.id = u.response_id) as has_survey_row from survey_photo_uploads u group by response_id order by 1;"
```

Other useful checks:

```bash
psql -d punjab_industrial_survey -c "select username, is_active from users;"
psql -d punjab_stress_test -c "select pg_get_constraintdef(oid) from pg_constraint where conname = 'industrial_units_establishment_year_check';"
du -sh /tmp/stress-uploads
```

---

## 8. Clean up

Do this when the tests are finished.

1. Stop the backend and the frontend (**Ctrl+C** in their tabs) and close the app tab in Chrome.
2. Delete the copy database and the fake photos. If `dropdb` says the database is in use, disconnect it in pgAdmin or quit pgAdmin, then run it again:

```bash
dropdb punjab_stress_test
rm -rf /tmp/stress-uploads
```

3. Check that both are gone (expect `0` and a "No such file or directory" message):

```bash
psql -l | grep -c punjab_stress_test
ls /tmp/stress-uploads 2>&1
```

4. Remove the test account from the main local database. This command was not run during the project, so check first that nothing belongs to the account:

```bash
psql -d punjab_industrial_survey -c "select id, username from users where username = 'stress-test-user';"
psql -d punjab_industrial_survey -c "delete from users where username = 'stress-test-user';"
```

   If the second command is refused because of linked rows, do not force it; leave the account.

5. In Chrome, clear the test data stored for `localhost:5173`: DevTools > **Application** > **Storage** > **Clear site data**.
6. Clear the password from the terminal tab:

```bash
unset TEST_USERNAME TEST_PASSWORD
```

---

## 9. Settings (environment variables) the scripts understand

| Variable | Used by | Meaning |
|---|---|---|
| `TEST_USERNAME`, `TEST_PASSWORD` | all scripts | The login (typed at the prompt) |
| `BASE_URL` | all scripts | Default `http://localhost:3002`. Scripts refuse any address that is not this machine. |
| `CONFIRM_COPY_DB=yes` | the write tests | You confirm the backend uses the throwaway copy |
| `DURATION` | `run.js`, `form-conditional-test.js`, `sync-test.js` | Seconds per level |
| `LEVELS` | same | Connection counts, for example `10,50,100,200` |
| `MAX_SURVEYS`, `BATCH`, `PHOTO_KB` | `sync-test.js` | Surveys per level, surveys per sync call, photo size in KB (up to 2800) |
| `PHOTO_Q_INTERVIEW`, `PHOTO_Q_SIGNBOARD` | `sync-test.js`, `injection-test.js` | The two photo question IDs (default 87 and 88) |
| `DB_NOTE` | `run.js` | Text for the report's database line |
| `YEAR`, `OUT` | `make-inject.js` | Establishment year for the injected survey, and the output file name |

---

## 10. Common problems

| What you see | What it means and what to do |
|---|---|
| `Set TEST_USERNAME and TEST_PASSWORD first.` | A new terminal tab has no login. Redo section 5. |
| `Login failed with HTTP 401` | Wrong username or password, or the account is missing in this database |
| `Stress test failed: fetch failed` | The backend is not running. Start it (section 4.2). |
| `This test WRITES data...` | Set `CONFIRM_COPY_DB=yes` after checking the backend uses the copy (section 4.4) |
| The probe survey was NOT accepted, with a database message | A fake value breaks a database rule (for example the year). Fix the value in `template-draft.json`. |
| `SyntaxError ... after JSON` | `template-draft.json` has stray text after the closing `}`. Remove it and check with the `JSON OK` command. |
| `Cannot find module '.../something.js'` | A typo in the file name, or you are in the wrong folder. Check with `ls *.js`. |
| `createdb`: source database is being accessed by other users | Stop the backend and disconnect pgAdmin, then try again |
| `psql: command not found` | Redo the PATH step in section 1 and open a new terminal window |
| Chrome Console refuses to paste | Type `allow pasting`, press Enter, paste again |
| `window.copy`/`copy` is not defined | Run `copy(window.draftJson)` as its own command; it does not work inside other code |
| The photo button does nothing | The app needs a rear camera (`OverconstrainedError`). Use `make-inject.js`. |
| Sync Now shows "Photo upload failed (HTTP 500)" | The backend is not running (the dev proxy answers for it) |
