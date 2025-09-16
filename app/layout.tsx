export const metadata = { title: "WhatsApp Helper" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body style={{ fontFamily: "system-ui", margin: 24 }}>
        {children}
      </body>
    </html>
  );
}