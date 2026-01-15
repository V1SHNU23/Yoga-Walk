import { NavLink } from "react-router-dom";
import HomeIcon from '../icons/home.svg';
import HomeIconFill from '../icons/home-fill.svg';
import MapIcon from '../icons/map.svg';
import MapIconFill from '../icons/map-fill.svg';
import LibIcon from '../icons/lib.svg';
import LibIconFill from '../icons/lib-fill.svg';
import ProfileIcon from '../icons/profile.svg';
import ProfileIconFill from '../icons/profile-fill.svg';

function AppNav() {
  const getNavClass = ({ isActive }) =>
    `navBtn ${isActive ? "navBtnActive" : ""}`;

  return (
    <nav className="appNav">
      <ul>
        <li>
          <NavLink to="/" end className={getNavClass}>
            <img src={HomeIcon} className="icon outline" />
            <img src={HomeIconFill} className="icon filled" />
            <span className="navLabel">Home</span>
          </NavLink>
        </li>

        <li>
          <NavLink to="/map" className={getNavClass}>
            <img src={MapIcon} className="icon outline" />
            <img src={MapIconFill} className="icon filled" />
            <span className="navLabel">Maps</span>
          </NavLink>
        </li>

        <li>
          <NavLink to="/library" className={getNavClass}>
            <img src={LibIcon} className="icon outline" />
            <img src={LibIconFill} className="icon filled" />
            <span className="navLabel">Library</span>
          </NavLink>
        </li>

        <li>
          <NavLink to="/profile" className={getNavClass}>
            <img src={ProfileIcon} className="icon outline" />
            <img src={ProfileIconFill} className="icon filled" />
            <span className="navLabel">Profile</span>
          </NavLink>
        </li>
      </ul>
    </nav>
  );
}

export default AppNav;
