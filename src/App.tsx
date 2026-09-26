import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import MobileNav from '@/components/MobileNav';
import { TriageProvider } from '@/hooks/useTriageContext';
import Dashboard from '@/pages/Dashboard';
import HealthRecord from '@/pages/HealthRecord';
import TriageChat from '@/pages/TriageChat';
import BookVet from '@/pages/BookVet';

function App() {
  return (
    <BrowserRouter>
      <TriageProvider>
        <div className="flex min-h-screen bg-[var(--cream)]">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <MobileNav />
            <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/record" element={<HealthRecord />} />
                <Route path="/chat" element={<TriageChat />} />
                <Route path="/book" element={<BookVet />} />
              </Routes>
            </main>
          </div>
        </div>
      </TriageProvider>
    </BrowserRouter>
  );
}

export default App;
