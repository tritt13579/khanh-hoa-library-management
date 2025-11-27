"use client";

import React, { useState } from "react";
import {
  UserIcon,
  CreditCardIcon,
  Bars3Icon,
  XMarkIcon,
  BellIcon,
} from "@heroicons/react/24/solid";
import Link from "next/link";
import DarkModeToggle from "./DarkModeToggle";
import UserDropdown from "./UserDropdown";
import { Button } from "../ui/button";

const ReaderHeader = ({ user }: { user: any }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="bg-background text-foreground">
      {/* ===== HEADER ===== */}
      <header className="fixed left-0 top-0 z-50 w-full bg-background shadow-md">
        <div className="flex items-center justify-between p-4">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <img
              src="images/logo/logoKH.jpg"
              alt="Logo Thư viện Khánh Hòa"
              className="h-12 w-12 rounded-full object-cover"
            />
            <p className="text-xl font-semibold">Thư viện Tỉnh Khánh Hòa</p>
          </div>

          {/* Toggle menu button (mobile) */}
          <div className="flex lg:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-foreground focus:outline-none"
            >
              {isMenuOpen ? (
                <XMarkIcon className="h-8 w-8" />
              ) : (
                <Bars3Icon className="h-8 w-8" />
              )}
            </button>
          </div>

          {/* Desktop menu */}
          <div className="hidden w-2/3 items-center justify-end space-x-6 lg:flex">
            {/* Auth buttons */}
            <div className="flex items-center space-x-4">
              <DarkModeToggle />

              {user ? (
                <UserDropdown />
              ) : (
                <Button asChild variant="outline">
                  <Link href="/login">Đăng nhập</Link>
                </Button>
              )}
            </div>

            {/* Icons */}
            <div className="flex items-center space-x-4">
              <button
                title="Thông báo"
                className="rounded-full bg-accent p-2 text-accent-foreground transition hover:bg-accent/80"
                onClick={() => (location.href = "/library")}
              >
                <BellIcon className="h-6 w-6" />
              </button>
              <button
                title="Thẻ thư viện"
                className="rounded-full bg-accent p-2 text-accent-foreground transition hover:bg-accent/80"
                onClick={() => (location.href = "/library-card")}
              >
                <CreditCardIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="flex flex-col items-center space-y-3 pb-4 lg:hidden">
            {[
              {
                icon: <UserIcon className="h-5 w-5 text-primary" />,
                label: "Đăng nhập",
                href: "/login",
              },
              {
                icon: <BellIcon className="h-5 w-5 text-primary" />,
                label: "Thông báo",
                href: "/notifications",
              },
              {
                icon: <CreditCardIcon className="h-5 w-5 text-primary" />,
                label: "Thẻ thư viện",
                href: "/library-card",
              },
            ].map(({ icon, label, href }, idx) => (
              <button
                key={idx}
                onClick={() => (location.href = href)}
                className="flex w-11/12 items-center justify-start space-x-3 rounded-lg bg-muted px-4 py-2 transition hover:bg-muted/70"
              >
                {icon}
                <span className="text-base font-medium text-foreground">
                  {label}
                </span>
              </button>
            ))}
          </div>
        )}
      </header>
    </div>
  );
};

export default ReaderHeader;
