import React from "react";
import { motion } from "framer-motion";
import Card from "./Card"; 
import "./WalkSummaryCard.css"; 
import distanceIcon from "../icons/road.svg"; 
import durationIcon from "../icons/clock.svg"; 
import posesIcon from "../icons/pose.svg";
import FireIcon from "../icons/pose.svg";

const WalkSummaryCard = ({ distance, duration, checkpoints, onSave, onClose }) => {
  return (
    <div className="summary-overlay">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
      >
        <Card className="summary-card">
          {/* Close Button */}
          <button className="summary-close-btn" onClick={onClose}>
            &times;
          </button>

          <div className="summary-header">
            <h2>Great Job!</h2>
            <p>Walk Completed</p>
          </div>

          <div className="summary-metrics-grid">
            {/* DISTANCE */}
            <div className="metric-item">
              <img src={distanceIcon} alt="Distance" className="metric-icon" />
              <span className="metric-value">{distance} km</span>
              <span className="metric-label">Distance</span>
            </div>
            
            {/* DURATION */}
            <div className="metric-item">
              <img src={durationIcon} alt="Duration" className="metric-icon" />
              <span className="metric-value">{Math.floor(duration / 60)} min</span>
              <span className="metric-label">Duration</span>
            </div>

            {/* POSES */}
            <div className="metric-item">
              <img src={posesIcon} alt="Poses" className="metric-icon" />
              <span className="metric-value">{checkpoints}</span>
              <span className="metric-label">Poses</span>
            </div>
          </div>

          <button className="btn-primary summary-btn" onClick={onSave}>
            Save to History
          </button>
        </Card>
      </motion.div>
    </div>
  );
};

export default WalkSummaryCard;