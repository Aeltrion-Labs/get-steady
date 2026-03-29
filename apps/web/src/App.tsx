import { Nav } from "./sections/Nav";
import { Hero } from "./sections/Hero";
import { Problem } from "./sections/Problem";
import { Philosophy } from "./sections/Philosophy";
import { Features } from "./sections/Features";
import { Privacy } from "./sections/Privacy";
import { OpenSource } from "./sections/OpenSource";
import { FinalCta } from "./sections/FinalCta";
import { Footer } from "./sections/Footer";

export function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Problem />
        <Philosophy />
        <Features />
        <Privacy />
        <OpenSource />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
