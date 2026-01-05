import { useState } from "react";
import "../styles/checklist.css";
// We can use standard icons or text. I'll use simple text/emoji for simplicity
import { motion } from "framer-motion"; // Optional, but since we have it installed

export default function ChecklistModal({ onClose, onConfirm }) {
  const [items, setItems] = useState({
    water: false,
    headphones: false,
    dnd: false,
    battery: false,
  });

  const allChecked = Object.values(items).every((val) => val);

  const toggleItem = (key) => {
    setItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="modalOverlay">
      <div className="checklistCard">
        <h2 className="checklistTitle">Ready to Walk?</h2>
        <p className="checklistSubtitle">Let's get set up for a mindful journey.</p>

        <div className="checklistItems">
          <CheckItem 
            label="Water Bottle 💧" 
            checked={items.water} 
            onClick={() => toggleItem('water')} 
          />
          <CheckItem 
            label="Headphones Connected 🎧" 
            checked={items.headphones} 
            onClick={() => toggleItem('headphones')} 
          />
          <CheckItem 
            label="Do Not Disturb Mode 🔕" 
            checked={items.dnd} 
            onClick={() => toggleItem('dnd')} 
          />
          <CheckItem 
            label="Battery Sufficient 🔋" 
            checked={items.battery} 
            onClick={() => toggleItem('battery')} 
          />
        </div>

        <div className="verticalButtonGroup">
          <button 
            className="cardButton" 
            disabled={!allChecked}
            style={{ opacity: allChecked ? 1 : 0.5 }}
            onClick={onConfirm}
          >
            {allChecked ? "Let's Go!" : "Complete the Checklist"}
          </button>
          
          <button 
            className="cardButton cardButtonSecondary" 
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function CheckItem({ label, checked, onClick }) {
  return (
    <div className={`checkItem ${checked ? "checked" : ""}`} onClick={onClick}>
      <div className="checkCircle">
        {checked && "✓"}
      </div>
      <span className="checkLabel">{label}</span>
    </div>
  );
}