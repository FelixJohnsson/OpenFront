import "./globals.css";

export const metadata = {
  title: "OpenFront - Territorial Conquest Game",
  description:
    "A multiplayer territorial conquest game inspired by territorial.io",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main className="min-h-screen flex flex-col">{children}</main>
      </body>
    </html>
  );
}
