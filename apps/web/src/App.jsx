import React, { Suspense } from 'react';
import { Route, Routes, BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { OnboardingProvider } from './contexts/OnboardingContext.jsx';
import { RecommendationProvider } from './contexts/RecommendationContext.jsx';
import { Toaster } from '@/components/ui/sonner';
import ScrollToTop from './components/ScrollToTop.jsx';
import ProtectedRoleRoute from './components/ProtectedRoleRoute.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';
import PatientLayout from './components/PatientLayout.jsx';

// Public Pages
import RoleSelectionLandingPage from './pages/RoleSelectionLandingPage.jsx';
import AuthIndividualPage from './pages/AuthIndividualPage.jsx';
import AuthEmployerPage from './pages/AuthEmployerPage.jsx';
import AuthInsurancePage from './pages/AuthInsurancePage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

// Lazy Loaded Patient Pages
const PatientOnboardingPage = React.lazy(() => import('./pages/PatientOnboardingPage.jsx'));
const PatientDashboardPage = React.lazy(() => import('./pages/PatientDashboardPage.jsx'));
const PatientHealthRecordsPage = React.lazy(() => import('./pages/PatientHealthRecordsPage.jsx'));
const AIRecommendationsPage = React.lazy(() => import('./pages/AIRecommendationsPage.jsx'));
const MarketplaceSearchPage = React.lazy(() => import('./pages/MarketplaceSearchPage.jsx'));
const BookingPage = React.lazy(() => import('./pages/BookingPage.jsx'));
const PatientAppointmentsPage = React.lazy(() => import('./pages/PatientAppointmentsPage.jsx'));
const PatientPrescriptionsPage = React.lazy(() => import('./pages/PatientPrescriptionsPage.jsx'));

// Legacy Patient Pages
const PharmacyPage = React.lazy(() => import('./pages/PharmacyPage.jsx'));
const TelemedicinePage = React.lazy(() => import('./pages/TelemedicinePage.jsx'));
const HealthGoalsPage = React.lazy(() => import('./pages/HealthGoalsPage.jsx'));

// Lazy Loaded Employer Pages
const EmployerOnboardingPage = React.lazy(() => import('./pages/EmployerOnboardingPage.jsx'));
const EmployerDashboardPage = React.lazy(() => import('./pages/EmployerDashboardPage.jsx'));
const EmployeeManagementPage = React.lazy(() => import('./pages/EmployeeManagementPage.jsx'));
const EmployerAnalyticsPage = React.lazy(() => import('./pages/EmployerAnalyticsPage.jsx'));
const EmployerCostsPage = React.lazy(() => import('./pages/EmployerCostsPage.jsx'));
const EmployerMessagingPage = React.lazy(() => import('./pages/EmployerMessagingPage.jsx'));
const EmployerSettingsPage = React.lazy(() => import('./pages/EmployerSettingsPage.jsx'));
const BulkOnboardingPage = React.lazy(() => import('./pages/BulkOnboardingPage.jsx'));
const EmployerContractsPage = React.lazy(() => import('./pages/EmployerContractsPage.jsx'));

// Lazy Loaded Insurance Pages
const InsuranceDashboardPage = React.lazy(() => import('./pages/InsuranceDashboardPage.jsx'));
const InsuranceMembersOutcomesPage = React.lazy(() => import('./pages/InsuranceMembersOutcomesPage.jsx'));
const InsuranceContractsPage = React.lazy(() => import('./pages/InsuranceContractsPage.jsx'));
const InsuranceGenericsPage = React.lazy(() => import('./pages/InsuranceGenericsPage.jsx'));
const InsurancePaymentsPage = React.lazy(() => import('./pages/InsurancePaymentsPage.jsx'));
const InsuranceAnalyticsPage = React.lazy(() => import('./pages/InsuranceAnalyticsPage.jsx'));
const InsuranceSettingsPage = React.lazy(() => import('./pages/InsuranceSettingsPage.jsx'));

// Lazy Loaded Provider Pages
const ProviderDashboard = React.lazy(() => import('./pages/ProviderDashboard.jsx'));
const ProviderAppointmentsPage = React.lazy(() => import('./pages/ProviderAppointmentsPage.jsx'));
const PatientManagementPage = React.lazy(() => import('./pages/PatientManagementPage.jsx'));
const ProviderMessagingPage = React.lazy(() => import('./pages/ProviderMessagingPage.jsx'));

function App() {
  return (
    <Router>
      <AuthProvider>
        <OnboardingProvider>
          <RecommendationProvider>
            <ScrollToTop />
            <Suspense fallback={
              <div className="h-screen w-full flex items-center justify-center bg-background">
                <LoadingSpinner size="lg" />
              </div>
            }>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<RoleSelectionLandingPage />} />
                <Route path="/auth/individual" element={<AuthIndividualPage />} />
                <Route path="/auth/employer" element={<AuthEmployerPage />} />
                <Route path="/auth/insurance" element={<AuthInsurancePage />} />

                {/* Patient Routes */}
                <Route path="/patient/*" element={
                  <ProtectedRoleRoute requiredRole="individual">
                    <PatientLayout>
                      <Routes>
                        <Route path="onboarding" element={<PatientOnboardingPage />} />
                        <Route path="dashboard" element={<PatientDashboardPage />} />
                        <Route path="records" element={<PatientHealthRecordsPage />} />
                        <Route path="ai-recommendations" element={<AIRecommendationsPage />} />
                        <Route path="marketplace" element={<MarketplaceSearchPage />} />
                        <Route path="booking" element={<BookingPage />} />
                        <Route path="appointments" element={<PatientAppointmentsPage />} />
                        <Route path="prescriptions" element={<PatientPrescriptionsPage />} />
                        <Route path="pharmacy" element={<PharmacyPage />} />
                        <Route path="telemedicine" element={<TelemedicinePage />} />
                        <Route path="health-goals" element={<HealthGoalsPage />} />
                      </Routes>
                    </PatientLayout>
                  </ProtectedRoleRoute>
                } />

                {/* Employer Routes */}
                <Route path="/employer/onboarding" element={<ProtectedRoleRoute requiredRole="employer"><EmployerOnboardingPage /></ProtectedRoleRoute>} />
                <Route path="/employer/dashboard" element={<ProtectedRoleRoute requiredRole="employer"><EmployerDashboardPage /></ProtectedRoleRoute>} />
                <Route path="/employer/employees" element={<ProtectedRoleRoute requiredRole="employer"><EmployeeManagementPage /></ProtectedRoleRoute>} />
                <Route path="/employer/analytics" element={<ProtectedRoleRoute requiredRole="employer"><EmployerAnalyticsPage /></ProtectedRoleRoute>} />
                <Route path="/employer/costs" element={<ProtectedRoleRoute requiredRole="employer"><EmployerCostsPage /></ProtectedRoleRoute>} />
                <Route path="/employer/messaging" element={<ProtectedRoleRoute requiredRole="employer"><EmployerMessagingPage /></ProtectedRoleRoute>} />
                <Route path="/employer/settings" element={<ProtectedRoleRoute requiredRole="employer"><EmployerSettingsPage /></ProtectedRoleRoute>} />
                <Route path="/employer/bulk-onboarding" element={<ProtectedRoleRoute requiredRole="employer"><BulkOnboardingPage /></ProtectedRoleRoute>} />
                <Route path="/employer/contracts" element={<ProtectedRoleRoute requiredRole="employer"><EmployerContractsPage /></ProtectedRoleRoute>} />

                {/* Insurance Routes */}
                <Route path="/insurance/dashboard" element={<ProtectedRoleRoute requiredRole="insurance"><InsuranceDashboardPage /></ProtectedRoleRoute>} />
                <Route path="/insurance/members" element={<ProtectedRoleRoute requiredRole="insurance"><InsuranceMembersOutcomesPage /></ProtectedRoleRoute>} />
                <Route path="/insurance/contracts" element={<ProtectedRoleRoute requiredRole="insurance"><InsuranceContractsPage /></ProtectedRoleRoute>} />
                <Route path="/insurance/generics" element={<ProtectedRoleRoute requiredRole="insurance"><InsuranceGenericsPage /></ProtectedRoleRoute>} />
                <Route path="/insurance/payments" element={<ProtectedRoleRoute requiredRole="insurance"><InsurancePaymentsPage /></ProtectedRoleRoute>} />
                <Route path="/insurance/analytics" element={<ProtectedRoleRoute requiredRole="insurance"><InsuranceAnalyticsPage /></ProtectedRoleRoute>} />
                <Route path="/insurance/settings" element={<ProtectedRoleRoute requiredRole="insurance"><InsuranceSettingsPage /></ProtectedRoleRoute>} />

                {/* Provider Routes */}
                <Route path="/provider/dashboard" element={<ProtectedRoleRoute requiredRole="provider"><ProviderDashboard /></ProtectedRoleRoute>} />
                <Route path="/provider/appointments" element={<ProtectedRoleRoute requiredRole="provider"><ProviderAppointmentsPage /></ProtectedRoleRoute>} />
                <Route path="/provider/patients" element={<ProtectedRoleRoute requiredRole="provider"><PatientManagementPage /></ProtectedRoleRoute>} />
                <Route path="/provider/messaging" element={<ProtectedRoleRoute requiredRole="provider"><ProviderMessagingPage /></ProtectedRoleRoute>} />

                {/* Catch-all Route */}
                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
            <Toaster position="top-center" closeButton />
          </RecommendationProvider>
        </OnboardingProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;