import { useState } from "react";
import { useNavigate } from "react-router-dom";
import homepageBg from "../assets/nirvana.png";
import logo from "../assets/yogawalk-logo.png";
import { MOTIVATIONAL_QUOTES } from "../data/quotes";
import ShinyText from "../components/ShinyText";
import MindfulTransition from "../components/MindfulTransition";

export default function HomePage() {
  const navigate = useNavigate();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [dailyQuote] = useState(() => {
    const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
    return MOTIVATIONAL_QUOTES[randomIndex];
  });

  const handleStartClick = () => {
    setIsTransitioning(true);
  };

  const handleTransitionComplete = () => {
    navigate("/map");
  };

  return (
    <div className="homeContainer">
      {/* 5. Conditionally render the transition overlay */}
      {isTransitioning && (
        <MindfulTransition onComplete={handleTransitionComplete} />
      )}
      
      <div
        className="homeBackground"
        style={{ backgroundImage: `url(${homepageBg})` }}
      ></div>

      <img src={logo} alt="Yoga Walk" className="homeLogo" />
      
      {/* Bottom sheet card */}
      <div className="homeBottomSheet">
        <h2 className="homeGreeting">Welcome back, Vishnu</h2>
        
        <p className="homeQuote">
          <ShinyText 
            text={dailyQuote} 
            disabled={false} 
            speed={3} 
            className="custom-shiny-text" 
            color="#526b57"      
            shineColor="#61b329" 
          />
        </p>

        <div className="verticalButtonGroup">
          <button className="cardButton" onClick={handleStartClick}>
            Start a Yoga Walk
          </button>
          <button className="cardButton cardButtonSecondary">View Checkpoints</button>
          <button className="cardButton cardButtonSecondary">Pose Library</button>
        </div>
      </div>
    </div>
  );
}