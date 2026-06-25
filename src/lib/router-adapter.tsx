"use client";
/**
 * router-adapter.tsx
 *
 * Drop-in compatibility shim that exports Next.js navigation APIs
 * under the same names as react-router-dom. This allows existing
 * components to switch their import from "react-router-dom" to
 * "@/lib/router-adapter" with zero logic changes.
 *
 * Exports:
 *  - useNavigate  → wraps useRouter (push / replace / go / back / forward)
 *  - useLocation  → wraps usePathname + useSearchParams
 *  - useParams    → re-exports useParams from next/navigation
 *  - useSearchParams → re-exports useSearchParams from next/navigation
 *  - Link         → wraps Link from next/link (mapping to -> href)
 *  - Navigate     → redirect component using useRouter
 *  - useNavigationType → always returns "PUSH"
 */

import { useRouter, usePathname, useSearchParams as nextUseSearchParams, useParams as nextUseParams } from "next/navigation";
import { useEffect } from "react";
import NextLink from "next/link";
import React from "react";

// ─── useParams wrapper ──────────────────────────────────────────────────────
export function useParams<T extends Record<string, any> = Record<string, string | undefined>>(): T {
  const params = nextUseParams();
  return (params || {}) as T;
}

// ─── useSearchParams wrapper ────────────────────────────────────────────────
export function useSearchParams() {
  const searchParams = nextUseSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const setSearchParams = (nextInit: any) => {
    const current = new URLSearchParams(searchParams?.toString() || "");
    const updated = typeof nextInit === "function" ? nextInit(current) : new URLSearchParams(nextInit);
    router.push(`${pathname}?${updated.toString()}`);
  };

  return [searchParams || new URLSearchParams(), setSearchParams] as const;
}

// ─── Link wrapper mapping 'to' -> 'href' ────────────────────────────────────
interface LinkProps extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  to: string | { pathname: string; search?: string; hash?: string };
  replace?: boolean;
  state?: any;
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ to, replace, state, ...props }, ref) => {
    let href = "";
    if (typeof to === "string") {
      href = to;
    } else if (to && typeof to === "object") {
      href = to.pathname + (to.search || "") + (to.hash || "");
    }
    return <NextLink href={href} replace={replace} ref={ref} {...props} />;
  }
);
Link.displayName = "Link";

// ─── useNavigate ────────────────────────────────────────────────────────────
type NavigateFunction = {
  (to: string, options?: { replace?: boolean; state?: any }): void;
  (delta: number): void;
};

export function useNavigate(): NavigateFunction {
  const router = useRouter();
  const navigate: NavigateFunction = (to: string | number, options?: { replace?: boolean }) => {
    if (typeof to === "number") {
      if (to === -1) router.back();
      else if (to === 1) router.forward();
      return;
    }
    if (options?.replace) {
      router.replace(to);
    } else {
      router.push(to);
    }
  };
  return navigate;
}

// ─── useLocation ─────────────────────────────────────────────────────────────
export function useLocation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams?.toString() ? `?${searchParams.toString()}` : "";

  return {
    pathname: pathname || "",
    search,
    hash: typeof window !== "undefined" ? window.location.hash : "",
    state: null,
    key: pathname + search,
  };
}

// ─── useNavigationType ───────────────────────────────────────────────────────
export function useNavigationType(): "PUSH" | "POP" | "REPLACE" {
  return "PUSH";
}

// ─── Navigate (redirect component) ───────────────────────────────────────────
interface NavigateProps {
  to: string;
  replace?: boolean;
  state?: any;
}

export function Navigate({ to, replace }: NavigateProps): null {
  const router = useRouter();
  useEffect(() => {
    if (replace) {
      router.replace(to);
    } else {
      router.push(to);
    }
  }, [to, replace, router]);
  return null;
}
