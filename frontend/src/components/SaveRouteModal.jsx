import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

// Shared Save Route Modal for Library + Map completion flow
export default function SaveRouteModal({ isOpen, onClose, onSave }) {
  const [routeName, setRouteName] = useState("");
  const [note, setNote] = useState("");
  const [locationLabel, setLocationLabel] = useState("");

  // Prefill default name on open
  useEffect(() => {
    if (isOpen) {
      const today = new Date();
      const dateStr = today.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      setRouteName(`Yoga Walk – ${dateStr}`);
      setNote("");
      setLocationLabel("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!routeName.trim()) {
      alert("Please enter a route name.");
      return;
    }
    onSave({
      name: routeName.trim(),
      note: note.trim(),
      locationLabel: locationLabel.trim(),
      createdAt: new Date().toISOString(),
    });
  };

  return (
    <div className="libModalOverlay" onClick={onClose}>
      <motion.div
        className="libModalCard"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="libModalTitle">Save Route</h3>

        <form onSubmit={handleSubmit}>
          <div className="libModalFormGroup">
            <label className="libModalLabel">
              Route Name <span className="libModalRequired">*</span>
            </label>
            <input
              type="text"
              className="libModalInput"
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              placeholder="Yoga Walk – Dec 15, 2024"
              required
              autoFocus
            />
          </div>

          <div className="libModalFormGroup">
            <label className="libModalLabel">Note / Intention (optional)</label>
            <textarea
              className="libModalTextarea"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g., Morning meditation walk, Evening reflection..."
              rows={3}
            />
          </div>

          <div className="libModalFormGroup">
            <label className="libModalLabel">Location Label (optional)</label>
            <input
              type="text"
              className="libModalInput"
              value={locationLabel}
              onChange={(e) => setLocationLabel(e.target.value)}
              placeholder="e.g., Central Park, Home neighborhood..."
            />
          </div>

          <p className="libModalHelperText">
            💡 Saved routes are for reuse; walk history is automatic.
          </p>

          <div className="libModalActions">
            <button
              type="button"
              className="libModalBtn cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="libModalBtn save">
              Save Route
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}


