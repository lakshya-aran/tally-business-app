import { Link } from 'react-router-dom';
import { Alert } from '../../components/ui/Feedback';

/**
 * In development without SMTP the API returns the email link in the response
 * (never in production). Show it so the flow can be completed locally.
 */
export default function DevLinkNotice({ link }) {
  if (!link) return null;
  let to = link;
  try {
    const u = new URL(link);
    to = u.pathname + u.search;
  } catch {
    /* keep as-is */
  }
  return (
    <Alert tone="info" className="mt-4">
      <p className="font-medium">Development mode: email not sent</p>
      <p className="mt-0.5">
        SMTP isn't configured, so here is the link that would have been emailed:{' '}
        <Link to={to} className="font-medium underline">
          open link
        </Link>
      </p>
    </Alert>
  );
}
