import {
  HomeIcon,
  HashtagIcon,
  BellIcon,
  InboxIcon,
  BookmarkIcon,
  UserIcon,
  EllipsisHorizontalCircleIcon,
} from "@heroicons/react/24/outline";
import Image from "next/image";
import React from "react";

export default function Sidebar() {
  return (
    <nav className="h-screen hidden sm:flex flex-col sticky top-0 p-3 xl:ml-20">
      <div className="relative h-full">
        <div className="py-3">
          <Image src={"/next.svg"} width={48} height={48} alt="logo" />
        </div>
        <ul>
          <SidebarLink text="Home" Icon={HomeIcon} />
          <SidebarLink text="Explore" Icon={HashtagIcon} />
          <SidebarLink text="Notifications" Icon={BellIcon} />
          <SidebarLink text="Messages" Icon={InboxIcon} />
          <SidebarLink text="Bookmarks" Icon={BookmarkIcon} />
          <SidebarLink text="Profile" Icon={UserIcon} />
          <SidebarLink text="More" Icon={EllipsisHorizontalCircleIcon} />
        </ul>
        <button className="hidden bg-[#F4AF01] w-[120px] h-[32px] rounded-full text-white font-medium cursor-pointer shadow-md mt-2 lg:block">
          Bumble
        </button>
        <div className="absolute bottom-0">User Info </div>
      </div>
    </nav>
  );
}

interface SidebarLinkProps {
  text: string;
  Icon: React.ForwardRefExoticComponent<
    Omit<React.SVGProps<SVGSVGElement>, "ref"> & {
      title?: string | undefined;
      titleId?: string | undefined;
    } & React.RefAttributes<SVGSVGElement>
  >;
}

function SidebarLink({ text, Icon }: SidebarLinkProps) {
  return (
    <li className="flex items-center text-md mb-2 space-x-3 p-2.5">
      <Icon className="h-5" />
      <span className="hidden lg:block">{text}</span>
    </li>
  );
}
