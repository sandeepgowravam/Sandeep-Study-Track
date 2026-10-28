# Study Buddies

A shared daily progress tracker for study partners. Static HTML, CSS and JavaScript, with no build step.

```
index.html
favicon.svg
vercel.json
firestore.rules
css/style.css
js/config.js   settings: subjects, goals, Firebase
js/util.js  js/store.js  js/seed.js  js/charts.js  js/views.js  js/app.js
```

## Features
Team overview, daily check-in with per-subject hours, a feed with reactions and threaded replies, "needs help" flags, nudges, task board, exam countdowns, focus timer, streaks, study grid, weekly goals, progress reports, badges, CSV export, dark mode, phone layout.

## Deploy
1. Push this folder to a GitHub repository.
2. On vercel.com choose Add New, then Project, and import the repository. Framework: Other. Leave the build settings empty. Deploy.

## Share progress between members (required for a real team)
Without this step each browser only sees its own data.
1. Create a free project at console.firebase.google.com.
2. Build, then Authentication, then Sign-in method: enable Anonymous.
3. Build, then Firestore Database: create a database.
4. Firestore, then Rules: paste the contents of `firestore.rules` and Publish.
5. Project settings, then Your apps, then Web: register an app and copy the config into `js/config.js`. Set `enabled: true` and `seedDemo: false`.
6. Push to GitHub. Vercel redeploys.
7. Everyone opens the site, enters the same team code (any long phrase you agree on), and adds their name.
