import { useState } from "react";
import Card from "../components/Card.jsx";
import SettingsIcon from "../icons/settings.svg";
import SettingsIconFill from "../icons/settings-fill.svg";

export default function ProfilePage({ onChangePage }) {
  const [user] = useState({
    name: "Vishnu",
    streak: 7,
    walks: 12,
    minutes: 240,
    poses: 36,
    weeklyProgress: 0.6, // 60%
    level: "Tranquil Seeker",
    levelProgress: 0.45, // 45%
  });

  return (
    <div className="profilePage">
      {/* gradient background handled purely in CSS */}
      <div className="profileBackground" />

      {/* content */}
      <div className="profileInner">
        {/* header */}
        <header className="profileHeader">
          {/* settings button */}
          <button
            type="button"
            className="profileSettingsBtn"
            onClick={() => onChangePage && onChangePage("settings")}
          >
            <img
              src={SettingsIcon}
              className="profileSettingsIcon outline"
              alt="Open settings"
            />
            <img
              src={SettingsIconFill}
              className="profileSettingsIcon filled"
              alt=""
              aria-hidden="true"
            />
          </button>

          <div className="profileAvatar">
            <span className="profileAvatarInitial">
              {user.name.charAt(0)}
            </span>
          </div>

          <h1 className="profileName">{user.name}</h1>
          <p className="profileStreak">{user.streak} day streak</p>
        </header>

        {/* stats row */}
        <section className="profileStatsRow">
          <Card className="profileStatCard">
            <div className="profileStatLabel">Walks</div>
            <div className="profileStatValue">{user.walks}</div>
          </Card>

          <Card className="profileStatCard">
            <div className="profileStatLabel">Minutes</div>
            <div className="profileStatValue">{user.minutes}</div>
          </Card>

          <Card className="profileStatCard">
            <div className="profileStatLabel">Poses</div>
            <div className="profileStatValue">{user.poses}</div>
          </Card>
        </section>

        {/* weekly progress */}
        <section className="profileSection">
          <Card className="profileCard">
            <div className="profileSectionHeader">
              <h2 className="profileSectionTitle">This week</h2>
              <span className="profileSectionMeta">
                {Math.round(user.weeklyProgress * 100)}%
              </span>
            </div>

            <div className="profileProgressTrack">
              <div
                className="profileProgressFill"
                style={{ width: `${user.weeklyProgress * 100}%` }}
              />
            </div>

            <p className="profileSectionText">
              {user.walks} walks completed this week
            </p>
          </Card>
        </section>

        {/* level card */}
        <section className="profileSection">
          <Card className="profileCard">
            <div className="profileSectionHeader">
              <h2 className="profileSectionTitle">Current level</h2>
              <span className="profileSectionMeta">
                {user.level}
              </span>
            </div>

            <div className="profileProgressTrack">
              <div
                className="profileProgressFill profileProgressFillSoft"
                style={{ width: `${user.levelProgress * 100}%` }}
              />
            </div>

            <p className="profileSectionText">
              Keep walking to unlock the next level.
            </p>
          </Card>
        </section>

        {/* actions */}
        <section className="profileActions">
          <button
            type="button"
            className="profilePrimaryButton"
          >
            Edit profile
          </button>
          <button
            type="button"
            className="profileSecondaryButton"
          >
            View achievements
          </button>
        </section>
      </div>
    </div>
  );
}
