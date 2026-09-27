import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './lib/dataContext';
import { AuthProvider } from './lib/authContext';
import { ToastProvider } from './components/ui/ToastContext';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Dataset } from './pages/Dataset';
import { EDA } from './pages/EDA';
import { Train } from './pages/Train';
import { Predict } from './pages/Predict';
import { Performance } from './pages/Performance';
import { ModelComparison } from './pages/ModelComparison';
import { History } from './pages/History';
import { AboutSonar } from './pages/AboutSonar';
import { FAQ } from './pages/FAQ';
import { ModelDocumentation } from './pages/ModelDocumentation';

export default function App() {
  return (
    <AppProvider>
      <AuthProvider>
        <ToastProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="login" element={<Login />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="dataset" element={<Dataset />} />
                <Route path="eda" element={<EDA />} />
                <Route path="train" element={<Train />} />
                <Route path="predict" element={<Predict />} />
                <Route path="performance" element={<Performance />} />
                <Route path="model-comparison" element={<ModelComparison />} />
                <Route path="compare" element={<ModelComparison />} />
                <Route path="history" element={<History />} />
                <Route path="documentation" element={<ModelDocumentation />} />
                <Route path="model-docs" element={<ModelDocumentation />} />
                <Route path="theory" element={<ModelDocumentation />} />
                <Route path="about-sonar" element={<AboutSonar />} />
                <Route path="faq" element={<FAQ />} />
              </Route>
            </Routes>
          </Router>
        </ToastProvider>
      </AuthProvider>
    </AppProvider>
  );
}
