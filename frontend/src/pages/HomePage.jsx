import homepageBg from "../backgrounds/homepage.png";

export default function HomePage() {
  return (
    <div className="homeContainer">
      {/* Full background */}
      <div
        className="homeBackground"
        style={{ backgroundImage: `url(${homepageBg})` }}
      ></div>

      <h1 className="homeTitle">Yoga Walk</h1>
      
      {/* Bottom sheet card */}
      <div className="homeBottomSheet">
        <h2 className="homeGreeting">Welcome back, Vishnu</h2>
        <p className="homeSubtitle">Choose an option below</p>

        <div className="verticalButtonGroup">
          <button className="cardButton">Start a Yoga Walk</button>
          <button className="cardButton cardButtonSecondary">View Checkpoints</button>
          <button className="cardButton cardButtonSecondary">Pose Library</button>
        </div>
      </div>
    </div>
  );
}
