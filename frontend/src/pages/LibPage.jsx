import { useState } from "react";
import Card from "../components/Card.jsx";
import AnimatedList from "../components/AnimatedList.jsx";

import SearchIcon from "../icons/search.svg";
import StarIcon from "../icons/star.svg";
import StarIconFill from "../icons/star-fill.svg";

function LibrarySearch({ value, onChange }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`libSearchPill ${open ? "libSearchPillOpen" : ""}`}>
      <button
        type="button"
        className="libSearchIconWrap"
        onClick={() => setOpen((prev) => !prev)}
      >
        <img src={SearchIcon} alt="Search" className="libSearchIconImg" />
      </button>

      <div className="libSearchInputWrap">
        <input
          className="libSearchInput"
          type="text"
          placeholder="Search poses..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
        />
      </div>
    </div>
  );
}

const initialPoses = [
  { id: 1, name: "Tree Pose", duration: "30 sec", image: null, favorite: false },
  { id: 2, name: "Downward Dog", duration: "30 sec", image: null, favorite: false },
  { id: 3, name: "Upward Salute", duration: "30 sec", image: null, favorite: false },
  { id: 4, name: "Bridge Pose", duration: "30 sec", image: null, favorite: false },
  { id: 5, name: "Warrior I", duration: "30 sec", image: null, favorite: false },
  { id: 6, name: "Warrior II", duration: "30 sec", image: null, favorite: false },
  { id: 7, name: "Cat-Cow", duration: "5 breaths", image: null, favorite: false },
  { id: 8, name: "Child’s Pose", duration: "45 sec", image: null, favorite: false },
  { id: 9, name: "Cobra Pose", duration: "30 sec", image: null, favorite: false },
  { id: 10, name: "Lotus Pose", duration: "60 sec", image: null, favorite: false },
  { id: 11, name: "Seated Forward Fold", duration: "45 sec", image: null, favorite: false },
  { id: 12, name: "Triangle Pose", duration: "30 sec", image: null, favorite: false },
  { id: 13, name: "Boat Pose", duration: "30 sec", image: null, favorite: false },
  { id: 14, name: "Pigeon Pose", duration: "45 sec", image: null, favorite: false }
];

export default function LibPage() {
  const [activeTab, setActiveTab] = useState("poses");
  const [query, setQuery] = useState("");
  const [poses, setPoses] = useState(initialPoses);

  function toggleFavorite(id) {
    setPoses((prev) =>
      prev.map((pose) =>
        pose.id === id ? { ...pose, favorite: !pose.favorite } : pose
      )
    );
  }

  const visiblePoses = poses.filter((pose) => {
    if (activeTab === "favorites" && !pose.favorite) return false;
    return pose.name.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <div className="libPage">
      {/* full page background */}
      
      {/* foreground content */}
      <div className="libPageInner">
        {/* header */}
        <div className="libHeader">
          <h1 className="libTitle">Pose Library</h1>
          <LibrarySearch value={query} onChange={setQuery} />
        </div>

        {/* tabs */}
        <div className="libTabs">
          <button
            type="button"
            className={`libTab ${activeTab === "poses" ? "libTabActive" : ""}`}
            onClick={() => setActiveTab("poses")}
          >
            Poses
          </button>
          <button
            type="button"
            className={`libTab ${activeTab === "routines" ? "libTabActive" : ""}`}
            onClick={() => setActiveTab("routines")}
          >
            Routines
          </button>
          <button
            type="button"
            className={`libTab ${activeTab === "favorites" ? "libTabActive" : ""}`}
            onClick={() => setActiveTab("favorites")}
          >
            Favorites
          </button>
        </div>

        {/* list content */}
        <div className="libList">
          {(activeTab === "poses" || activeTab === "favorites") && (
            <>
              {visiblePoses.length > 0 ? (
                <AnimatedList
                  items={visiblePoses}
                  showGradients={true}
                  displayScrollbar={true}
                  enableArrowNavigation={false}
                  renderItem={(pose) => (
                    <Card className="libPoseCard">
                      <div className="libPoseRow">
                        <div className="libPoseThumb">
                          {pose.image ? (
                            <img src={pose.image} alt={pose.name} />
                          ) : (
                            <span
                              className="libPoseThumbEmoji"
                              aria-hidden="true"
                            >
                              🧘
                            </span>
                          )}
                        </div>

                        <div className="libPoseText">
                          <div className="libPoseName">{pose.name}</div>
                          <div className="libPoseMeta">{pose.duration}</div>
                        </div>

                        <button
                          type="button"
                          className="libPoseFavoriteBtn"
                          onClick={() => toggleFavorite(pose.id)}
                        >
                          <img
                            src={pose.favorite ? StarIconFill : StarIcon}
                            alt={
                              pose.favorite
                                ? "Remove from favorites"
                                : "Add to favorites"
                            }
                          />
                        </button>

                        <div className="libPoseChevron" aria-hidden="true">
                          ›
                        </div>
                      </div>
                    </Card>
                  )}
                />
              ) : (
                <p className="libEmptyState">
                  {activeTab === "favorites"
                    ? "You have not added any favorites yet."
                    : "No poses match that search."}
                </p>
              )}
            </>
          )}

          {activeTab === "routines" && (
            <p className="libEmptyState">Routines will appear here later.</p>
          )}
        </div>
      </div>
    </div>
  );
}

