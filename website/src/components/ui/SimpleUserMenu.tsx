import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigation } from "../../contexts/NavigationContext";
import { useNavigate } from "react-router-dom";
import ProfileImage from "./ProfileImage";

const SimpleUserMenu: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const { startNavigation } = useNavigation();
  const navigate = useNavigate();

  if (!isAuthenticated || !user) {
    return null;
  }

  const handleProfileClick = () => {
    startNavigation("/profile");
  };

  return (
    <button
      onClick={handleProfileClick}
      className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted transition-colors"
    >
      <ProfileImage src={user.photoURL} alt="User" size="sm" />
      <span className="text-sm font-medium hidden sm:block">
        {user.displayName || user.email}
      </span>
    </button>
  );
};

export default SimpleUserMenu;
