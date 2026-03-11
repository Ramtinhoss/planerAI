import type {Metadata} from 'next';
import './globals.css'; // Global styles
import { FirebaseProvider } from '@/components/FirebaseProvider';

export const metadata: Metadata = {
  title: 'WanderAI - AI Travel Planner',
  description: 'Your personal AI travel agent and planner.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <FirebaseProvider>
          {children}
        </FirebaseProvider>
      </body>
    </html>
  );
}
