import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirect to overview page
  redirect('/overview');
}

