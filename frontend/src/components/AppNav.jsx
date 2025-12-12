import HomeIcon from '../icons/home.svg';
import HomeIconFill from '../icons/home-fill.svg';
import MapIcon from '../icons/map.svg';
import MapIconFill from '../icons/map-fill.svg';
import LibIcon from '../icons/lib.svg';
import LibIconFill from '../icons/lib-fill.svg';
import ProfileIcon from '../icons/profile.svg';
import ProfileIconFill from '../icons/profile-fill.svg';

function AppNav({ activePage, onChangePage }) {
  return (
    <nav className="appNav">
      <ul>
        <li>
          <button
            className={`navBtn ${activePage === "home" ? "navBtnActive" : ""}`}
            onClick={() => onChangePage("home")}
          >
            <img src={HomeIcon} className="icon outline" />
            <img src={HomeIconFill} className="icon filled" />
            <span className="navLabel">Home</span>
          </button>
        </li>

        <li>
          <button
            className={`navBtn ${activePage === "maps" ? "navBtnActive" : ""}`}
            onClick={() => onChangePage("maps")}
          >
            <img src={MapIcon} className="icon outline" />
            <img src={MapIconFill} className="icon filled" />
            <span className="navLabel">Maps</span>
          </button>
        </li>

        <li>
          <button
            className={`navBtn ${activePage === "library" ? "navBtnActive" : ""}`}
            onClick={() => onChangePage("library")}
          >
            <img src={LibIcon} className="icon outline" />
            <img src={LibIconFill} className="icon filled" />
            <span className="navLabel">Library</span>
          </button>
        </li>

        <li>
          <button
            className={`navBtn ${activePage === "profile" ? "navBtnActive" : ""}`}
            onClick={() => onChangePage("profile")}
          >
            <img src={ProfileIcon} className="icon outline" />
            <img src={ProfileIconFill} className="icon filled" />
            <span className="navLabel">Profile</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}

export default AppNav;
