import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "../styles/transition.css";

const PREP_MESSAGES = [
  "💧 Grab your water...",
  "🎧 Connect headphones...",
  "🔋 Check your battery...",
];

const FINAL_MESSAGE = "🚀 Let's go!";

export default function MindfulTransition({ onComplete }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Step 0, 1, 2 = Show prep messages
    // Step 3 = Clear screen (short pause)
    // Step 4 = Show "Let's Go"
    
    const interval = setInterval(() => {
      setStep((prev) => {
        if (prev >= 4) return prev; // Stop at final step
        return prev + 1;
      });
    }, 1200); // 1.2 seconds per beat

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // When we hit step 4 ("Let's go"), wait a bit then finish
    if (step === 4) {
      const timeout = setTimeout(onComplete, 1500);
      return () => clearTimeout(timeout);
    }
  }, [step, onComplete]);

  return (
    <div className="transitionOverlay">
      <AnimatePresence mode="wait">
        
        {/* PHASE 1: The Checklist List */}
        {step < 3 && (
          <motion.div
            key="list-container"
            className="transitionListContainer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }} // Smooth fade out of the whole list
            transition={{ duration: 0.5 }}
          >
            {PREP_MESSAGES.map((msg, index) => (
              <motion.h2
                key={index}
                className="transitionText"
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: step >= index ? 1 : 0, 
                  y: step >= index ? 0 : 20 
                }}
                transition={{ duration: 0.5 }}
              >
                {msg}
              </motion.h2>
            ))}
          </motion.div>
        )}

        {/* PHASE 2: The Final Message (Step 4) */}
        {step >= 3 && (
          <motion.h2
            key="final-message"
            className="transitionText final"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            {FINAL_MESSAGE}
          </motion.h2>
        )}

      </AnimatePresence>
    </div>
  );
}