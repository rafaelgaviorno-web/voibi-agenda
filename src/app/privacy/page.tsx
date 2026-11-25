import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage, { EMPRESA_LEGAL as E } from '@/components/LegalPage';

export const metadata: Metadata = {
  title: 'Privacy Policy | Voibi Agenda',
  description: 'How Voibi Agenda collects, uses, stores, shares and deletes personal data and Google user data.',
};

export default function PrivacyPage() {
  return (
    <LegalPage titulo="Privacy Policy" lang="en">
      <p>
        This Privacy Policy explains how <strong>Voibi Agenda</strong> ({E.site}), the appointment scheduling application
        of {E.marca}, operated by <strong>{E.razaoSocial}</strong> (Brazilian company registration CNPJ {E.cnpj}),
        collects, uses, stores, shares, protects and deletes personal data, including data received from Google APIs.
        It complies with the Brazilian General Data Protection Law (Lei nº 13.709/2018, &quot;LGPD&quot;) and with the
        Google API Services User Data Policy. A Portuguese version is available at{' '}
        <Link href="/privacidade">/privacidade</Link>.
      </p>

      <h2>1. What Voibi Agenda does</h2>
      <p>
        Voibi Agenda is a web application used by clinics and medical/dental offices (our &quot;customers&quot;) to
        manage the schedules of their professionals and to receive appointments from their own clients and patients
        (&quot;end clients&quot;). Appointments can be booked through a public booking page, by the clinic staff in the
        admin panel, or by the clinic&apos;s virtual assistant on WhatsApp through the Voibi Agenda API. Optionally, each
        professional can connect their Google Calendar so that appointments appear in their calendar with a Google Meet
        link.
      </p>

      <h2>2. Information we collect</h2>
      <ul>
        <li><strong>Admin panel users:</strong> name, email address, company and access permissions.</li>
        <li><strong>Schedules:</strong> professional name, optional photo, working hours, breaks and blocked times.</li>
        <li><strong>End clients:</strong> name, phone/WhatsApp number, optional email address, date and time of the appointment, type of service and notes provided when booking.</li>
        <li><strong>Technical logs:</strong> request date and time, IP address and browser information, used for security and troubleshooting.</li>
        <li><strong>Google user data</strong>, only when a professional connects their Google account (see section 3).</li>
      </ul>

      <h2>3. Google user data</h2>
      <p>
        Connecting a Google account is optional. It only happens when a professional clicks &quot;Conectar Google
        Agenda&quot; (Connect Google Calendar) in their schedule settings and grants access on Google&apos;s consent screen.
      </p>

      <h3>3.1 Data accessed</h3>
      <ul>
        <li><strong>Email address of the Google account</strong> (scopes <code>openid</code> and <code>email</code>): used only to show which account is connected.</li>
        <li><strong>Google Calendar events created by Voibi Agenda</strong> (scope <code>https://www.googleapis.com/auth/calendar.events</code>): we create, update and delete only the events that correspond to appointments booked in Voibi Agenda. We do not list, read or modify any other event in the user&apos;s calendar.</li>
        <li><strong>Free/busy information</strong> (scope <code>https://www.googleapis.com/auth/calendar.freebusy</code>): only the start and end times of busy periods. This does not include titles, descriptions, locations, attendees or any other event content.</li>
      </ul>

      <h3>3.2 How we use Google user data</h3>
      <ul>
        <li>When an appointment is booked in Voibi Agenda, we create an event in the professional&apos;s Google Calendar with the appointment date and time, the end client&apos;s name and contact, the appointment notes, and a Google Meet link for online appointments.</li>
        <li>When the appointment is rescheduled or cancelled, we update or delete that same event.</li>
        <li>When calculating available times for new appointments, we check the professional&apos;s busy periods so that we do not offer times when they already have a commitment.</li>
        <li>The Google Meet link is sent to the end client of that appointment (for example, in the WhatsApp confirmation) so they can join the meeting.</li>
      </ul>
      <p>We do not use Google user data for any other purpose.</p>

      <h3>3.3 How we store and protect Google user data</h3>
      <ul>
        <li>We store the connected account&apos;s email address, the OAuth refresh token issued by Google, and, for each appointment, the ID of the Google Calendar event and the Google Meet link.</li>
        <li>The OAuth token is stored in a database table that is only accessible by the application server; it is never sent to the browser. All data is transmitted over encrypted connections (HTTPS).</li>
        <li>Free/busy periods are read at the time available slots are calculated and are not stored.</li>
      </ul>

      <h3>3.4 Sharing of Google user data</h3>
      <p>
        We do not sell, rent, share or transfer Google user data to third parties. We do not use Google user data for
        advertising, for user profiling, or to develop, improve or train artificial intelligence or machine learning
        models. Our staff does not read Google user data, except with the user&apos;s explicit consent, when necessary for
        security purposes, or to comply with applicable law. The only Google data that leaves Voibi Agenda is the Google
        Meet link, which is sent to the end client of the corresponding appointment.
      </p>

      <h3>3.5 Retention and deletion of Google user data</h3>
      <ul>
        <li>A professional can disconnect their Google account at any time in the &quot;Google Agenda&quot; tab of their schedule settings. When they disconnect, we revoke the authorization with Google and immediately delete the stored token.</li>
        <li>Access can also be revoked at <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">myaccount.google.com/permissions</a>.</li>
        <li>Event IDs and Meet links are kept together with the appointment while the customer uses the service and are deleted together with it.</li>
        <li>To request deletion of any data, email <a href={`mailto:${E.email}`}>{E.email}</a>. We respond within 15 days.</li>
        <li>Events created in Google Calendar belong to the professional and remain in their calendar until they delete them.</li>
      </ul>

      <h3>3.6 Limited Use</h3>
      <p>
        Voibi Agenda&apos;s use and transfer to any other app of information received from Google APIs will adhere to the{' '}
        <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">
          Google API Services User Data Policy
        </a>, including the Limited Use requirements.
      </p>

      <h3>3.7 No image generation or AI-generated content</h3>
      <p>
        Voibi Agenda does not generate, edit or distribute images, videos or any other media, and it does not use Google
        APIs or Google user data to create any content with artificial intelligence. In particular, Voibi Agenda does not
        and will not produce non-consensual intimate imagery (NCII) of any kind.
      </p>

      <h2>4. How we use other information</h2>
      <ul>
        <li>To provide the scheduling service: show available times, book, reschedule and cancel appointments.</li>
        <li>To send appointment notices and reminders through channels configured by the customer (for example, WhatsApp).</li>
        <li>To integrate with systems configured by the customer, such as virtual assistants, CRM and webhooks.</li>
        <li>To keep the service secure, prevent fraud and fix errors.</li>
        <li>To comply with legal obligations.</li>
      </ul>
      <p>
        The legal bases are performance of contract, legitimate interest, compliance with legal obligations and, where
        applicable, consent (LGPD, art. 7). For end-client data, the clinic is the data controller and {E.marca} acts as
        a data processor following the clinic&apos;s instructions.
      </p>

      <h2>5. Sharing of other information</h2>
      <ul>
        <li>Infrastructure providers that host the application and database, under confidentiality obligations.</li>
        <li>Google, only when a professional connects Google Calendar.</li>
        <li>Systems configured by the customer (webhooks, CRM, WhatsApp).</li>
        <li>Public authorities, when required by law or court order.</li>
      </ul>
      <p>We do not sell personal data.</p>

      <h2>6. Data retention</h2>
      <p>
        We keep data while the customer uses the service. After termination, data may be deleted or returned at the
        customer&apos;s request, except information we must keep by law. Google user data is deleted when the account is
        disconnected, as described in section 3.5.
      </p>

      <h2>7. Security</h2>
      <p>
        We use HTTPS encryption, access control per user and company, per-company API keys and restricted database
        access. If a security incident may create relevant risk, we will notify affected users and the Brazilian data
        protection authority (ANPD) as required by law.
      </p>

      <h2>8. Cookies</h2>
      <p>We only use the cookie required to keep users signed in to the admin panel. We do not use advertising cookies.</p>

      <h2>9. Your rights</h2>
      <p>
        Data subjects may request confirmation of processing, access, correction, anonymization, portability, deletion,
        information about sharing and withdrawal of consent (LGPD, art. 18). End clients of a clinic may contact the
        clinic directly or us, and we will forward the request. Contact:{' '}
        <a href={`mailto:${E.email}`}>{E.email}</a>.
      </p>

      <h2>10. Changes</h2>
      <p>We may update this policy. The date of the last update is shown at the top of this page, and relevant changes will be communicated to admin panel users.</p>

      <h2>11. Contact</h2>
      <p>
        {E.razaoSocial}, CNPJ {E.cnpj}. Email: <a href={`mailto:${E.email}`}>{E.email}</a>. Website: {E.site}.
      </p>
    </LegalPage>
  );
}
