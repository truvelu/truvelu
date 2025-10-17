import { memo } from "react";
import { SidebarTrigger, useSidebar } from "../ui/sidebar";

export const Header = () => {
  const { isMobile } = useSidebar();
  return (
    <div className="sticky top-0 z-10 h-hea h-header bg-white flex items-center border-b border-sidebar-border px-2">
      {isMobile && <SidebarTrigger className="p-2 cursor-pointer" />}
    </div>
  );
};

export default memo(Header);
