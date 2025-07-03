import "./globals.css";

const Layout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => (
  <html>
    <body>{children}</body>
  </html>
);

export default Layout;
