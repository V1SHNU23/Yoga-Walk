import { useState } from "react";
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
  const [dailyReminder, setDailyReminder] = useState(true);
  const [streakAlerts, setStreakAlerts] = useState(true);
  const [checkpointAlerts, setCheckpointAlerts] = useState(true);
  const [poseReminders, setPoseReminders] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);

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
              <Toggle
                checked={dailyReminder}
                onChange={setDailyReminder}
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
