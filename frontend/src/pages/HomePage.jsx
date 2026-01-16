import { useState } from "react";
import { useNavigate } from "react-router-dom";
import homepageBg from "../assets/nirvana.png";
import logo from "../assets/yogawalk-logo.png";
import { MOTIVATIONAL_QUOTES } from "../data/quotes";
import ShinyText from "../components/ShinyText";
import MindfulTransition from "../components/MindfulTransition";
import { useAppData } from "../contexts/DataContext";

export default function HomePage() {
  const navigate = useNavigate();
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  // Consume history and loading from DataContext
  const { history, loading } = useAppData();
  
  // Helper function to normalize walk dates into local YYYY-MM-DD strings
  const normalizeWalkDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // Build uniqueWalkDays from history (local YYYY-MM-DD)
  const uniqueWalkDays = loading 
    ? new Set() 
    : new Set(
        (history || [])
          .map(walk => normalizeWalkDate(walk.WalkDate))
          .filter(date => date !== null)
      );
  
  // Compute lastWalkDate from the most recent history entry
  const lastWalkDate = loading
    ? null
    : (() => {
        if (!history || history.length === 0) return null;
        
        // Find the most recent walk by WalkDate
        const sortedHistory = [...history]
          .filter(walk => walk.WalkDate)
          .sort((a, b) => new Date(b.WalkDate) - new Date(a.WalkDate));
        
        return sortedHistory.length > 0 
          ? normalizeWalkDate(sortedHistory[0].WalkDate)
          : null;
      })();

  // Calculate currentStreak: count consecutive days ending today
  const calculateCurrentStreak = () => {
    if (loading || uniqueWalkDays.size === 0) return 0;
    
    const today = normalizeWalkDate(new Date().toISOString());
    if (!today) return 0;
    
    // Count consecutive days backwards from today
    // If today has a walk, include it; if not, start from yesterday
    let streak = 0;
    let currentDate = new Date(today);
    
    // If today doesn't have a walk, start counting from yesterday
    if (!uniqueWalkDays.has(today)) {
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    // Count consecutive days backwards
    while (true) {
      const dateStr = normalizeWalkDate(currentDate.toISOString());
      if (!dateStr || !uniqueWalkDays.has(dateStr)) {
        break;
      }
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }
    
    return streak;
  };
  
  const currentStreak = calculateCurrentStreak();
  
  // Calculate best streak: find the longest consecutive sequence in history
  const calculateBestStreak = () => {
    if (loading || uniqueWalkDays.size === 0) return 0;
    
    const sortedDates = Array.from(uniqueWalkDays)
      .map(date => new Date(date + 'T00:00:00'))
      .filter(date => !isNaN(date.getTime()))
      .sort((a, b) => a - b);
    
    if (sortedDates.length === 0) return 0;
    
    let bestStreak = 1;
    let currentStreak = 1;
    
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = sortedDates[i - 1];
      const currDate = sortedDates[i];
      const diffDays = Math.floor((currDate - prevDate) / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        // Consecutive day
        currentStreak++;
        bestStreak = Math.max(bestStreak, currentStreak);
      } else {
        // Gap found, reset current streak
        currentStreak = 1;
      }
    }
    
    return bestStreak;
  };
  
  const bestStreak = calculateBestStreak();
  
  // Get encouragement copy based on current streak
  const getEncouragementCopy = () => {
    if (loading) return '';
    if (currentStreak === 0) return 'Start your first streak today.';
    return '1 more day to keep it going.';
  };
  
  // Format last walk date for display
  const formatLastWalkDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString + 'T00:00:00');
    if (isNaN(date.getTime())) return null;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const walkDate = new Date(date);
    walkDate.setHours(0, 0, 0, 0);
    
    const diffTime = today - walkDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

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
        
        {/* Streak card */}
        <div className="streakCard">
          <div className="streakInfo">
            <span className="streakEmoji">🔥</span>
            <span className="streakText">
              {loading ? (
                'Calculating streak…'
              ) : currentStreak > 0 ? (
                `${currentStreak}-day streak`
              ) : (
                'Start your streak!'
              )}
            </span>
          </div>
          {!loading && bestStreak > 0 && bestStreak !== currentStreak && (
            <div className="bestStreakInfo">
              Best: {bestStreak} days
            </div>
          )}
          <div className="lastWalkInfo">
            {loading ? (
              'Loading walk history…'
            ) : lastWalkDate ? (
              `Last walked: ${formatLastWalkDate(lastWalkDate)}`
            ) : (
              'No walks yet'
            )}
          </div>
          {!loading && (
            <div className="encouragementCopy">
              {getEncouragementCopy()}
            </div>
          )}
        </div>
        
        <p className="homeQuote">
          <ShinyText 
            text={dailyQuote} 
            disabled={false} 
            speed={3} 
            className="custom-shiny-text" 
            color="#f7c01b"      
            shineColor="#4d672a"
            secondaryColor="#4d672a"
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