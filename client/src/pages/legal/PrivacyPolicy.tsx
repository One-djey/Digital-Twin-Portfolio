import { Link } from "wouter";
import { portfolioData } from "@shared/portfolio.ts";
import { LEGAL_ROUTES } from "@shared/chat.ts";
import LegalPage, { LegalTable, lowerFirst, type LegalSection } from "./LegalPage";

const { legal } = portfolioData;
const { publisher, retention } = legal;
const outsideEu = legal.subProcessors.filter(
  (p) => !p.location.startsWith("European Union"),
);

const mailto = <a href={`mailto:${publisher.email}`}>{publisher.email}</a>;

const sections: LegalSection[] = [
  {
    id: "who-are-we",
    title: "1. Who are we?",
    content: (
      <>
        <p>
          This website is published by <strong>{publisher.name}</strong>,{" "}
          {lowerFirst(publisher.status)}, SIRET {publisher.siret}, based in {publisher.city}
          . He is the data controller for the processing described in this
          policy.
        </p>
        <p>
          No data protection officer (DPO) has been appointed. For any question
          about your data, write to {mailto}.
        </p>
      </>
    ),
  },
  {
    id: "what-data",
    title: "2. What data do we process?",
    content: (
      <>
        <p>We only collect what the website needs to work:</p>
        <ul>
          <li>
            <strong>When you use the AI assistant</strong>: the messages you
            type and the assistant's answers; a random identifier stored in your
            browser's local storage (see section 9) to link your conversation to
            your browser; technical metadata about each answer (model used,
            number of tokens, response time, completion status); and your 👍/👎
            feedback, if you give it.
          </li>
          <li>
            <strong>When you ask the assistant to pass your request on</strong>:
            only with your explicit consent in the chat, your name, your email
            address, your phone number if you choose to give it, and a
            one-sentence summary of your request. These details are emailed to{" "}
            {publisher.name} together with the transcript of the conversation.
          </li>
          <li>
            <strong>When you use the contact form</strong>: your name, your
            email address and your message.
          </li>
          <li>
            <strong>To prevent abuse</strong>: your IP address, used to limit
            the number of requests. It is never stored as such: we only keep an
            irreversible salted hash of it, for 24 hours.
          </li>
          <li>
            <strong>Server logs</strong>: technical data about requests (such as
            date and time, requested page and response status), recorded by our
            host. They never contain the content of your messages.
          </li>
        </ul>
        <p>
          We do not use cookies, analytics or advertising trackers. Please do
          not share sensitive data (health, political opinions, bank details,
          passwords…) in the chat or in the contact form.
        </p>
      </>
    ),
  },
  {
    id: "purposes-and-legal-bases",
    title: "3. Why, and on what legal basis?",
    content: (
      <>
        <LegalTable>
          <thead>
            <tr>
              <th>Purpose</th>
              <th>Legal basis (GDPR)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                Answering your questions in the AI assistant and your contact
                requests
              </td>
              <td>
                Steps taken at your request before a possible contract (Art.
                6(1)(b))
              </td>
            </tr>
            <tr>
              <td>
                Passing your details and your conversation on to{" "}
                {publisher.name} (chat request)
              </td>
              <td>
                Your consent (Art. 6(1)(a)), which you can withdraw at any time
              </td>
            </tr>
            <tr>
              <td>
                Preventing abuse and securing the service (rate limiting, server
                logs)
              </td>
              <td>Legitimate interest (Art. 6(1)(f))</td>
            </tr>
            <tr>
              <td>
                Monitoring and improving the quality of answers (technical
                metadata, feedback)
              </td>
              <td>Legitimate interest (Art. 6(1)(f))</td>
            </tr>
          </tbody>
        </LegalTable>
        <p>
          We never sell your data and never use it for advertising. We do no
          profiling, and no automated decision producing legal effects on you is
          made.
        </p>
        <p>
          Your data is not used to train AI models: training on our data is
          disabled at Mistral AI, and OpenAI does not use data sent through its
          API for training by default.
        </p>
      </>
    ),
  },
  {
    id: "recipients",
    title: "4. Who receives your data?",
    content: (
      <>
        <p>
          Your data is only accessible to {publisher.name}. It is processed by
          the following sub-processors, solely to provide the service:
        </p>
        <LegalTable>
          <thead>
            <tr>
              <th>Sub-processor</th>
              <th>Purpose</th>
              <th>Location</th>
            </tr>
          </thead>
          <tbody>
            {legal.subProcessors.map((p) => (
              <tr key={p.name}>
                <td>
                  <a href={p.url} target="_blank" rel="noopener noreferrer">
                    {p.name}
                  </a>
                </td>
                <td>{p.purpose}</td>
                <td>{p.location}</td>
              </tr>
            ))}
          </tbody>
        </LegalTable>
      </>
    ),
  },
  {
    id: "transfers-outside-the-eu",
    title: "5. Transfers outside the EU",
    content: (
      <>
        <p>
          Some of our sub-processors are based in the United States:{" "}
          {outsideEu.map((p) => p.name).join(", ")}. These transfers are
          governed by the European Commission's Standard Contractual Clauses
          and/or the EU-US Data Privacy Framework, depending on the provider.
        </p>
        <p>
          The database is hosted in the European Union, and our main AI
          provider, Mistral AI, is based in France. OpenAI is only used when
          Mistral AI is unavailable.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "6. How long do we keep your data?",
    content: (
      <>
        <LegalTable>
          <thead>
            <tr>
              <th>Data</th>
              <th>Retention period</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                AI assistant conversations (messages, technical metadata,
                feedback)
              </td>
              <td>
                {retention.chatConversations}. You can delete them earlier at
                any time (see section 7).
              </td>
            </tr>
            <tr>
              <td>
                Contact form messages and requests passed on from the chat
                (including the conversation transcript sent with them)
              </td>
              <td>{retention.contactRequests}</td>
            </tr>
            <tr>
              <td>Rate-limiting counters</td>
              <td>{retention.rateLimitCounters}</td>
            </tr>
            <tr>
              <td>
                Random identifier in your browser (<code>userId</code>)
              </td>
              <td>{retention.browserId}</td>
            </tr>
          </tbody>
        </LegalTable>
        <p>
          Server logs are kept by our host for a limited period, according to
          its own log retention rules.
        </p>
      </>
    ),
  },
  {
    id: "ai-assistant",
    title: "7. About the AI assistant",
    content: (
      <ul>
        <li>
          The chat on this website is an <strong>AI assistant</strong>, not{" "}
          {publisher.name} himself. It answers from the information he has
          provided about his work.
        </li>
        <li>
          Its answers are generated automatically and may contain errors. They
          are indicative only and are not a contractual offer: prices,
          availability and any commitment are only valid once confirmed by{" "}
          {publisher.name} in writing.
        </li>
        <li>
          It only passes your details on to {publisher.name} if you explicitly
          agree in the chat.
        </li>
        <li>
          Do not share sensitive data (health, political opinions, bank details,
          passwords…) in the chat.
        </li>
        <li>
          You can delete your conversation from our database at any time with
          the <strong>"New conversation"</strong> button. A request already
          passed on to {publisher.name} with your consent is not affected: write
          to {mailto} to have it deleted.
        </li>
      </ul>
    ),
  },
  {
    id: "your-rights",
    title: "8. Your rights",
    content: (
      <>
        <p>Under the GDPR, you have the right to:</p>
        <ul>
          <li>access your data and get a copy of it;</li>
          <li>have it corrected if it is inaccurate;</li>
          <li>have it erased;</li>
          <li>restrict its processing;</li>
          <li>object to its processing;</li>
          <li>receive it in a portable format;</li>
          <li>
            withdraw your consent at any time, without affecting the processing
            carried out before.
          </li>
        </ul>
        <p>
          To exercise these rights, write to {mailto}. We answer within one
          month.
        </p>
        <p>
          If you believe your rights are not respected, you can lodge a
          complaint with the French data protection authority, the CNIL (
          <a
            href="https://www.cnil.fr"
            target="_blank"
            rel="noopener noreferrer"
          >
            www.cnil.fr
          </a>
          ).
        </p>
      </>
    ),
  },
  {
    id: "cookies-and-local-storage",
    title: "9. Cookies and local storage",
    content: (
      <>
        <p>
          This website does not use any cookies: no analytics, no advertising,
          no social media trackers.
        </p>
        <p>
          The AI assistant stores a single random identifier in your browser's
          local storage, under the key <code>userId</code>. It does not reveal
          who you are; it only lets the website show you your conversation again
          and link it to your requests. It is strictly necessary for the chat to
          work, so no consent banner is required. You can delete it at any time
          by clearing this website's data in your browser.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "10. Security",
    content: (
      <ul>
        <li>All traffic to the website is encrypted (HTTPS).</li>
        <li>
          Requests are rate-limited to prevent abuse, and IP addresses are only
          stored as irreversible hashes.
        </li>
        <li>Message content is never written to server logs.</li>
        <li>
          Access to the database and to the emails received is restricted to{" "}
          {publisher.name}.
        </li>
      </ul>
    ),
  },
  {
    id: "changes",
    title: "11. Changes to this policy",
    content: (
      <p>
        We may update this policy, for example when the website or its providers
        change. The "Last updated" date at the top of this page shows the
        current version.
      </p>
    ),
  },
  {
    id: "contact",
    title: "12. Contact us",
    content: (
      <p>
        For any question about this policy or your data, write to {mailto}. See
        also our <Link href={LEGAL_ROUTES.notice}>legal notice</Link>.
      </p>
    ),
  },
];

export default function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <p>
          This policy explains what personal data this website and its AI
          assistant process, why, for how long, and what your rights are. We
          keep it short and only collect what we need.
        </p>
      }
      sections={sections}
    />
  );
}
