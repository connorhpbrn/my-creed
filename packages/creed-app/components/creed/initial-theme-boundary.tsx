import type { ReactNode } from "react";
import { cookies } from "next/headers";

const THEME_COOKIE = "creed-theme";

export const INITIAL_THEME_BOUNDARY_ID = "creed-initial-theme";

export async function InitialThemeBoundary({ children }: { children: ReactNode }) {
  const storedTheme = (await cookies()).get(THEME_COOKIE)?.value;
  const themeClass = storedTheme === "dark" || storedTheme === "light"
    ? storedTheme
    : undefined;

  return (
    <div id={INITIAL_THEME_BOUNDARY_ID} className={`${themeClass ?? ""} contents`}>
      {children}
    </div>
  );
}
