import React from 'react';
import { ResizableNavbarDemo } from './ui/resizable-navbar-demo';

const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 w-full">
      <ResizableNavbarDemo />
    </header>
  );
};

export default Header;