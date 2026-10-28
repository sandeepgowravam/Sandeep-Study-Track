/* Study Buddies · config.js
 * The only file you normally need to edit.
 */
window.STUDY_CONFIG = {
  appName: "Study Buddies",

  // Subjects offered in the check-in form.
  subjects: ["VLSI", "AI", "BBA", "B.Tech", "Other"],

  // Targets used for progress bars and the study grid.
  weeklyGoalHours: 20,
  dailyGoalHours: 4,

  // Sample members and history. Only applies when Firebase is OFF.
  seedDemo: false,

  // Shared storage. With enabled:true all members see the same data live.
  firebase: {
    enabled: true,
    config: {
      apiKey: "AIzaSyDDqRs47HXYsdfX6HWRH8OKRFmtJGgZEw0",
      authDomain: "sandeep-bd526.firebaseapp.com",
      projectId: "sandeep-bd526",
      storageBucket: "sandeep-bd526.firebasestorage.app",
      messagingSenderId: "812664539508",
      appId: "1:812664539508:web:121d106542c77bb9ef4421"
    }
  }
};