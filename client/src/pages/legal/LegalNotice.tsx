import { Link } from "wouter";
import { portfolioData } from "@shared/portfolio.ts";
import { LEGAL_ROUTES } from "@shared/chat.ts";
import LegalPage, { lowerFirst, type LegalSection } from "./LegalPage";

const { legal } = portfolioData;
const { publisher, host } = legal;
const database = legal.subProcessors.find((p) => p.name.startsWith("Supabase"));

const mailto = <a href={`mailto:${publisher.email}`}>{publisher.email}</a>;

const sections: LegalSection[] = [
  {
    id: "publisher",
    title: "1. Publisher",
    content: (
      <>
        <p>This website is published by:</p>
        <ul>
          <li>
            <strong>{publisher.name}</strong>, {lowerFirst(publisher.status)}
          </li>
          <li>SIRET: {publisher.siret}</li>
          <li>Located in {publisher.city}</li>
          <li>Email: {mailto}</li>
          <li>{publisher.vat}</li>
        </ul>
      </>
    ),
  },
  {
    id: "publication-director",
    title: "2. Publication director",
    content: <p>The publication director is {legal.publicationDirector}.</p>,
  },
  {
    id: "hosting",
    title: "3. Hosting",
    content: (
      <>
        <p>
          The website and its API are hosted by <strong>{host.name}</strong>,{" "}
          {host.address} (
          <a href={host.url} target="_blank" rel="noopener noreferrer">
            {host.url.replace(/^https?:\/\//, "")}
          </a>
          ).
        </p>
        {database && (
          <p>
            The database is hosted by <strong>{database.name}</strong>, in the{" "}
            {database.location}.
          </p>
        )}
      </>
    ),
  },
  {
    id: "nature-of-the-service",
    title: "4. Nature of the service",
    content: (
      <>
        <p>
          This website presents the work of {publisher.name} as a freelance
          developer specialised in data and artificial intelligence: services,
          projects, resume and ways to get in touch.
        </p>
        <p>
          It includes an AI assistant that answers visitors' questions about
          this work. Its answers are generated automatically, may contain errors
          and are given for information only. They are not a contractual offer
          or commitment: prices, availability and any other commitment are only
          valid once confirmed by {publisher.name} in writing. See{" "}
          <Link href={`${LEGAL_ROUTES.privacy}#ai-assistant`}>
            About the AI assistant
          </Link>{" "}
          in the privacy policy.
        </p>
      </>
    ),
  },
  {
    id: "intellectual-property",
    title: "5. Intellectual property",
    content: (
      <>
        <p>
          All content on this site (texts, images, graphics, logos and visual
          identity) is the exclusive property of {publisher.name}, unless stated
          otherwise. Any reproduction, representation, modification or
          adaptation of all or part of it, by any means, without prior written
          permission is prohibited.
        </p>
        <p>
          The source code of the website itself is open source and distributed
          under the MIT license (see the <Link href="/about">About</Link> page).
        </p>
        <p>
          Third-party trademarks, logos and images shown on this site, in
          particular in the projects section, belong to their respective owners.
        </p>
      </>
    ),
  },
  {
    id: "liability",
    title: "6. Liability",
    content: (
      <>
        <p>
          The website is provided "as is". We do our best to keep its content
          accurate and up to date, but we cannot guarantee that it is complete
          or free of errors.
        </p>
        <p>
          We do not guarantee that the website will be available continuously or
          without interruption: it may be suspended, for example for maintenance
          or because of a technical issue at one of our providers.
        </p>
        <p>
          Answers from the AI assistant are indicative only and do not commit{" "}
          {publisher.name} (see section 4).
        </p>
      </>
    ),
  },
  {
    id: "personal-data-and-cookies",
    title: "7. Personal data and cookies",
    content: (
      <p>
        This website does not use cookies. How your personal data is processed
        (AI assistant, contact form, abuse prevention) and how to exercise your
        rights is explained in our{" "}
        <Link href={LEGAL_ROUTES.privacy}>privacy policy</Link>.
      </p>
    ),
  },
  {
    id: "external-links",
    title: "8. External links",
    content: (
      <p>
        This website contains links to third-party websites (projects, social
        networks, booking tools…). We have no control over these websites and
        are not responsible for their content or their privacy practices.
      </p>
    ),
  },
  {
    id: "applicable-law",
    title: "9. Applicable law",
    content: (
      <p>
        This legal notice is governed by French law. Any dispute shall be
        brought before the competent courts of Nice, France, subject to the
        mandatory rules protecting consumers, which may allow you to bring the
        case before the courts of your place of residence.
      </p>
    ),
  },
  {
    id: "contact",
    title: "10. Contact",
    content: (
      <p>
        For any question about this website, write to {mailto} or use the{" "}
        <Link href="/contact">contact form</Link>.
      </p>
    ),
  },
];

export default function LegalNotice() {
  return <LegalPage title="Legal Notice" sections={sections} />;
}
