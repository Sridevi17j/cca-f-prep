import Image from "next/image";
import { HomeExperience } from "@/components/HomeExperience";
import { ArrowIcon } from "@/components/icons";
import { getCatalog } from "@/lib/catalog";

export default function HomePage() {
  const catalog = getCatalog();

  return (
    <>
      <section className="hero page-shell">
        <div className="hero-copy">
          <p className="eyebrow">Independent product company · Chennai</p>
          <h1>
            We drill
            <br />
            <em>CCA-F.</em>
          </h1>
          <p className="hero-intro">
            A practice desk for PiHive cohort participants. Choose the Latest bank or the older GitHub dump,
            answer one question at a time, and read why immediately.
          </p>
          <div className="hero-actions">
            <a className="button button-dark" href="#banks">
              See the banks
              <ArrowIcon />
            </a>
          </div>
        </div>
        <aside className="hero-note">
          <p className="note-kicker">PiHive, in one line</p>
          <p className="note-copy">A small team’s practice site for the CCA-F. Less theatre. More product.</p>
          <p className="note-signoff">
            <span className="scribble" aria-hidden="true">
              ~
            </span>
            Built for the cohort.
          </p>
        </aside>
      </section>

      <div className="page-shell">
        <HomeExperience catalog={catalog} />
      </div>

      <section className="workbench page-shell" id="how">
        <div className="section-heading">
          <p className="eyebrow">Inside a session</p>
          <h2>Answer, then see why.</h2>
        </div>
        <div className="workbench-grid">
          <article>
            <span>01</span>
            <h3>Pick a bank</h3>
            <p>Latest is the current {catalog.latestCount}. Older dump is the GitHub cca-prep set of {catalog.olderCount}.</p>
          </article>
          <article>
            <span>02</span>
            <h3>Choose one</h3>
            <p>Four options. The one you pick locks in, so the score stays honest.</p>
          </article>
          <article>
            <span>03</span>
            <h3>Read the reason</h3>
            <p>Correct or wrong shows at once, with the right letter and the explanation on the same screen.</p>
          </article>
          <article>
            <span>04</span>
            <h3>Keep the score</h3>
            <p>Answered count and score so far stay in this browser. There is no login and no server.</p>
          </article>
        </div>
      </section>

      <section className="about page-shell" id="about">
        <div className="about-mark">
          <Image src="/logo-icon.png" alt="" width={140} height={156} />
        </div>
        <div className="about-copy">
          <p className="eyebrow">About this desk</p>
          <h2>Practice, with the answer in the open.</h2>
          <p>
            PiHive Technologies builds vertical AI products from Chennai. This desk is for people in the cohort
            who are preparing for CCA-F.
          </p>
          <p>
            The Latest bank is the one to use for current prep. The Older dump is the earlier six-exam set from
            the public cca-prep repository, labeled that way so it is never mistaken for Latest.
          </p>
        </div>
      </section>

      <section className="contact-wrap page-shell">
        <div className="contact">
          <div className="contact-intro">
            <h2>Do you have a problem that AI could solve?</h2>
            <p className="contact-note">The company site is pihivetech.com. This practice desk stays here.</p>
          </div>
          <div className="contact-details">
            <span>Direct email</span>
            <a href="mailto:sridevi@pihivetech.com">
              sridevi@pihivetech.com
              <ArrowIcon />
            </a>
            <p>Write directly to Sridevi, founder of PiHive.</p>
          </div>
        </div>
      </section>
    </>
  );
}
