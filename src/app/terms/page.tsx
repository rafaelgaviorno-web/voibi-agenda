import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage, { EMPRESA_LEGAL as E } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Terms of Service | Voibi Agenda',
  description: 'Terms of use of Voibi Agenda.',
};

export default function TermsPage() {
  return (
    <LegalPage titulo="Terms of Service" lang="en">
      <p>
        These terms govern the use of <strong>Voibi Agenda</strong> ({E.site}), the appointment scheduling application
        provided by <strong>{E.razaoSocial}</strong>, CNPJ {E.cnpj} (&quot;{E.marca}&quot;). By using it, you agree to
        these terms and to our <Link href="/privacy">Privacy Policy</Link>. A Portuguese version is available at{' '}
        <Link href="/termos">/termos</Link>.
      </p>

      <h2>1. The service</h2>
      <p>
        Voibi Agenda lets clinics manage their professionals&apos; schedules, publish booking pages, receive appointments
        through virtual assistants and integrations, and optionally sync appointments with Google Calendar, including a
        Google Meet link for online appointments.
      </p>

      <h2>2. Accounts</h2>
      <ul>
        <li>Access to the admin panel is provided to the customer company with a username and password.</li>
        <li>The customer is responsible for the users it creates, the permissions it grants and keeping passwords and API keys safe.</li>
        <li>Unauthorized access must be reported immediately to <a href={`mailto:${E.email}`}>{E.email}</a>.</li>
      </ul>

      <h2>3. Customer responsibilities</h2>
      <ul>
        <li>Use the service lawfully and in accordance with these terms.</li>
        <li>Have a legal basis to process its clients&apos; and patients&apos; data and inform them, as data controller under the LGPD.</li>
        <li>Keep working hours, blocked times and schedule settings accurate.</li>
      </ul>

      <h2>4. Acceptable use</h2>
      <p>
        The service may only be used for appointment scheduling. It must not be used to generate, store or distribute
        images or media of any kind, including AI-generated content or non-consensual intimate imagery (NCII). Voibi
        Agenda does not use Google APIs for any purpose other than the calendar features described in the Privacy Policy.
      </p>

      <h2>5. Third-party integrations</h2>
      <p>
        Integrations such as Google Calendar, Google Meet, WhatsApp, CRM and webhooks depend on third-party services and
        their terms. The Google connection is made by each professional and can be removed at any time. A failure to sync
        with Google does not prevent an appointment from being recorded in Voibi Agenda.
      </p>

      <h2>6. Availability and support</h2>
      <p>
        We work to keep the service available, but interruptions may occur for maintenance or reasons beyond our control.
        Support: <a href={`mailto:${E.email}`}>{E.email}</a>.
      </p>

      <h2>7. Plans and payment</h2>
      <p>Prices, payment terms and cancellation conditions are defined in the proposal or contract with each customer.</p>

      <h2>8. Intellectual property</h2>
      <p>
        The software and the Voibi brand belong to {E.marca}. Customers receive a non-exclusive, non-transferable license
        to use the service during their subscription. Data entered by the customer remains the customer&apos;s.
      </p>

      <h2>9. Limitation of liability</h2>
      <p>
        {E.marca} is not liable for indirect damages, lost profits or losses caused by misuse of the service, incorrect
        information entered by users or third-party service failures. Otherwise, liability is limited to the amount paid
        by the customer in the 12 months before the event, unless the law provides otherwise.
      </p>

      <h2>10. Termination</h2>
      <p>Customers may terminate as provided in their contract. {E.marca} may suspend accounts that violate these terms or the law.</p>

      <h2>11. Governing law</h2>
      <p>These terms are governed by the laws of Brazil.</p>

      <h2>12. Contact</h2>
      <p>{E.razaoSocial}, CNPJ {E.cnpj}. Email: <a href={`mailto:${E.email}`}>{E.email}</a>.</p>
    </LegalPage>
  );
}
