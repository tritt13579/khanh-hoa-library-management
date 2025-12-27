"use client";

import React, { useEffect } from "react";

interface Props {
  children: React.ReactNode;
}

export default function NoFooterLayout({ children }: Props) {
  useEffect(() => {
    document.body.classList.add("no-footer");
    return () => {
      document.body.classList.remove("no-footer");
    };
  }, []);

  return <>{children}</>;
}
