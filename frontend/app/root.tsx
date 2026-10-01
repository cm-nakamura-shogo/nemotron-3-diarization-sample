import type { LinksFunction } from "@remix-run/node";
import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteError } from "@remix-run/react";
import type { ReactNode } from "react";
import stylesheet from "./tailwind.css?url";

export const links: LinksFunction = () => [{ rel: "stylesheet", href: stylesheet }];

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#f8fafc" />
        <Meta /><Links />
      </head>
      <body>{children}<ScrollRestoration /><Scripts /></body>
    </html>
  );
}

export default function App() { return <Outlet />; }

export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <main className="mx-auto max-w-xl px-6 py-24">
      <p className="mb-3 text-sm font-medium text-primary">NEMOTRON / DIARIZATION</p>
      <h1 className="mb-4 text-2xl font-semibold">結果を読み込めませんでした</h1>
      <p className="text-sm leading-7 text-muted-foreground">
        {isRouteErrorResponse(error) ? String(error.data) : "ファイルを確認してから、ページを再読み込みしてください。"}
      </p>
      <a href="/" className="mt-6 inline-block text-sm text-primary underline">再読み込み</a>
    </main>
  );
}
