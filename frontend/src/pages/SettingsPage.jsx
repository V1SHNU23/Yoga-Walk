import { useState, useEffect } from "react";
import BackIcon from "../icons/back.svg";

function Toggle({ checked, onChange }) {
  return (
    <label className="settingsToggle">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="settingsToggleTrack">
        <span className="settingsToggleThumb" />
      </span>
    </label>
  );
}

export default function SettingsPage({ onChangePage }) {
  // simple local state for toggles (no persistence yet)
  const [dailyReminder, setDailyReminder] = useState(false);
  const [streakAlerts, setStreakAlerts] = useState(true);
  const [checkpointAlerts, setCheckpointAlerts] = useState(true);
  const [poseReminders, setPoseReminders] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);

  // NEW: Check if user is already subscribed when page loads
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.pushManager.getSubscription().then((subscription) => {
          setDailyReminder(!!subscription);
        });
      });
    }
  }, []);

  // NEW: Handle the specific logic for Push Notifications
  const handleReminderToggle = async (checked) => {
    if (!checked) {
      // For MVP, just visually toggle off. 
      // (Real app: call backend to remove sub from DB)
      setDailyReminder(false);
      return;
    }

    if (!("serviceWorker" in navigator)) {
      alert("Notifications not supported on this browser.");
      return;
    }

    // Request browser permission
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      alert("You need to allow notifications to get reminders.");
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;

      // TODO: Replace this with your generated Public Key from "npx web-push generate-vapid-keys"
      const publicVapidKey = "BAata_vEteQWcos37gHCP_Rf9NPLymVZSs2CwhcJQ9BPL6Aabgv7P1qTXia4Ti8eo3p0xgaGuUqcXWknTXNbJNc";

      // Subscribe the user
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicVapidKey,
      });

      // Send the subscription object to your backend
      await fetch("http://127.0.0.1:5000/api/subscribe", {
        method: "POST",
        body: JSON.stringify(subscription),
        headers: { "Content-Type": "application/json" },
      });

      setDailyReminder(true);
      alert("Daily reminders enabled! 🌿");
    } catch (err) {
      console.error("Subscription failed:", err);
      alert("Failed to enable reminders. Check console for details.");
    }
  };

  return (
    <div className="settingsPage">
      {/* HEADER */}
      <header className="settingsHeader">
        <button
          type="button"
          className="settingsBackBtn"
          onClick={() => onChangePage && onChangePage("profile")}
        >
          <img
            src={BackIcon}
            className="settingsBackIcon"
            alt="Back"
          />
          <span className="settingsBackLabel">Profile</span>
        </button>

        <h1 className="settingsTitle">Settings</h1>
      </header>

      {/* CONTENT */}
      <div className="settingsInner">
        {/* Profile section */}
        <section className="settingsSection">
          <h2 className="settingsSectionTitle">Profile</h2>
          <div className="settingsList">
            <button type="button" className="settingsItem">
              <div className="settingsItemText">
                <span className="settingsItemLabel">Edit profile</span>
                <span className="settingsItemSub">
                  Name, avatar
                </span>
              </div>
              <span className="settingsItemChevron">›</span>
            </button>

            <button type="button" className="settingsItem">
              <div className="settingsItemText">
                <span className="settingsItemLabel">Change email</span>
                <span className="settingsItemSub">
                  Update login email
                </span>
              </div>
              <span className="settingsItemChevron">›</span>
            </button>

            <button type="button" className="settingsItem">
              <div className="settingsItemText">
                <span className="settingsItemLabel">
                  Change password
                </span>
                <span className="settingsItemSub">
                  Keep your account secure
                </span>
              </div>
              <span className="settingsItemChevron">›</span>
            </button>
          </div>
        </section>

        {/* Notifications */}
        <section className="settingsSection">
          <h2 className="settingsSectionTitle">Notifications</h2>
          <div className="settingsList">
            <div className="settingsItem">
              <div className="settingsItemText">
                <span className="settingsItemLabel">
                  Daily walk reminder
                </span>
                <span className="settingsItemSub">
                  Gentle nudge to go for a Yoga Walk
                </span>
              </div>
              {/* WIRED UP TOGGLE */}
              <Toggle
                checked={dailyReminder}
                onChange={handleReminderToggle}
              />
            </div>

            <div className="settingsItem">
              <div className="settingsItemText">
                <span className="settingsItemLabel">
                  Streak alerts
                </span>
                <span className="settingsItemSub">
                  Celebrate and protect your streaks
                </span>
              </div>
              <Toggle
                checked={streakAlerts}
                onChange={setStreakAlerts}
              />
            </div>

            <div className="settingsItem">
              <div className="settingsItemText">
                <span className="settingsItemLabel">
                  Checkpoint alerts
                </span>
                <span className="settingsItemSub">
                  Reminders for upcoming checkpoints
                </span>
              </div>
              <Toggle
                checked={checkpointAlerts}
                onChange={setCheckpointAlerts}
              />
            </div>

            <div className="settingsItem">
              <div className="settingsItemText">
                <span className="settingsItemLabel">
                  Pose routine reminders
                </span>
                <span className="settingsItemSub">
                  Remind me to do saved routines
                </span>
              </div>
              <Toggle
                checked={poseReminders}
                onChange={setPoseReminders}
              />
            </div>
          </div>
        </section>

        {/* Preferences */}
        <section className="settingsSection">
          <h2 className="settingsSectionTitle">Preferences</h2>
          <div className="settingsList">
            <button type="button" className="settingsItem">
              <div className="settingsItemText">
                <span className="settingsItemLabel">Theme</span>
                <span className="settingsItemSub">
                  Light, dark, or system
                </span>
              </div>
              <span className="settingsItemChevron">›</span>
            </button>

            <button type="button" className="settingsItem">
              <div className="settingsItemText">
                <span className="settingsItemLabel">Units</span>
                <span className="settingsItemSub">
                  Minutes, steps, or breaths
                </span>
              </div>
              <span className="settingsItemChevron">›</span>
            </button>

            <div className="settingsItem">
              <div className="settingsItemText">
                <span className="settingsItemLabel">
                  Reduce motion
                </span>
                <span className="settingsItemSub">
                  Limit animations for comfort
                </span>
              </div>
              {/* You can wire this later */}
              <Toggle checked={false} onChange={() => {}} />
            </div>

            <button type="button" className="settingsItem">
              <div className="settingsItemText">
                <span className="settingsItemLabel">Language</span>
                <span className="settingsItemSub">
                  App language
                </span>
              </div>
              <span className="settingsItemChevron">›</span>
            </button>
          </div>
        </section>

        {/* Privacy & Data */}
        <section className="settingsSection">
          <h2 className="settingsSectionTitle">Privacy &amp; data</h2>
          <div className="settingsList">
            <div className="settingsItem">
              <div className="settingsItemText">
                <span className="settingsItemLabel">
                  Privacy mode
                </span>
                <span className="settingsItemSub">
                  Hide stats on profile screen
                </span>
              </div>
              <Toggle
                checked={privacyMode}
                onChange={setPrivacyMode}
              />
            </div>

            <button type="button" className="settingsItem">
              <div className="settingsItemText">
                <span className="settingsItemLabel">
                  Download activity data
                </span>
                <span className="settingsItemSub">
                  Export walks and poses
                </span>
              </div>
              <span className="settingsItemChevron">›</span>
            </button>

            <button type="button" className="settingsItem">
              <div className="settingsItemText">
                <span className="settingsItemLabel">
                  Clear history
                </span>
                <span className="settingsItemSub">
                  Remove local activity records
                </span>
              </div>
              <span className="settingsItemChevron">›</span>
            </button>

            <button type="button" className="settingsItem settingsItemDanger">
              <div className="settingsItemText">
                <span className="settingsItemLabel">
                  Delete account
                </span>
                <span className="settingsItemSub">
                  Permanently remove your data
                </span>
              </div>
              <span className="settingsItemChevron">›</span>
            </button>
          </div>
        </section>

        {/* About */}
        <section className="settingsSection">
          <h2 className="settingsSectionTitle">About</h2>
          <div className="settingsList">
            <button type="button" className="settingsItem">
              <div className="settingsItemText">
                <span className="settingsItemLabel">
                  About Yoga Walk
                </span>
                <span className="settingsItemSub">
                  Learn more about the app
                </span>
              </div>
              <span className="settingsItemChevron">›</span>
            </button>

            <button type="button" className="settingsItem">
              <div className="settingsItemText">
                <span className="settingsItemLabel">
                  Terms &amp; privacy
                </span>
                <span className="settingsItemSub">
                  Legal information and policies
                </span>
              </div>
              <span className="settingsItemChevron">›</span>
            </button>

            <div className="settingsItem settingsItemStatic">
              <div className="settingsItemText">
                <span className="settingsItemLabel">App version</span>
                <span className="settingsItemSub">1.0.0</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}