import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { EmptyState } from '../components/ui/Feedback';
import Button from '../components/ui/Button';

export default function NotFound() {
  return (
    <div className="card">
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="The page you're looking for doesn't exist or has moved."
        action={
          <Link to="/dashboard">
            <Button>Back to dashboard</Button>
          </Link>
        }
      />
    </div>
  );
}
