export const metadata = {
  title: "Games Zoom API",
  description: "API REST do Games Zoom",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
