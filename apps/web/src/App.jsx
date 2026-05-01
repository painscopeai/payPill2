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
import AuthAdminPage from './pages/AuthAdminPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import FormSubmissionPage from './pages/FormSubmissionPage.jsx';
import ProtectedAdminRoute from './components/admin/ProtectedAdminRoute.jsx';
import AdminLayout from './components/admin/AdminLayout.jsx';
import AdminLandingPage from './pages/admin/AdminLandingPage.jsx';
import AdminLoginPage from './pages/admin/AdminLoginPage.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';

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

const PatientsAnalyticsPage = React.lazy(() => import('./pages/admin/analytics/PatientsAnalyticsPage.jsx'));
const EmployersAnalyticsPage = React.lazy(() => import('./pages/admin/analytics/EmployersAnalyticsPage.jsx'));
const AdminInsuranceAnalyticsPage = React.lazy(() => import('./pages/admin/analytics/InsuranceAnalyticsPage.jsx'));
const ProvidersAnalyticsPage = React.lazy(() => import('./pages/admin/analytics/ProvidersAnalyticsPage.jsx'));
const SubscriptionsAnalyticsPage = React.lazy(() => import('./pages/admin/analytics/SubscriptionsAnalyticsPage.jsx'));
const FinancialAnalyticsPage = React.lazy(() => import('./pages/admin/analytics/FinancialAnalyticsPage.jsx'));
const AIAnalyticsPage = React.lazy(() => import('./pages/admin/analytics/AIAnalyticsPage.jsx'));
const FormsAnalyticsPage = React.lazy(() => import('./pages/admin/analytics/FormsAnalyticsPage.jsx'));
const PatientsManagementPage = React.lazy(() => import('./pages/admin/PatientsManagementPage.jsx'));
const EmployersManagementPage = React.lazy(() => import('./pages/admin/EmployersManagementPage.jsx'));
const InsuranceUsersManagementPage = React.lazy(() => import('./pages/admin/InsuranceUsersManagementPage.jsx'));
const TransactionsManagementPage = React.lazy(() => import('./pages/admin/TransactionsManagementPage.jsx'));
const SubscriptionPlansPage = React.lazy(() => import('./pages/admin/SubscriptionPlansPage.jsx'));
const SubscriptionAssignmentPage = React.lazy(() => import('./pages/admin/SubscriptionAssignmentPage.jsx'));
const SubscriptionMonitoringPage = React.lazy(() => import('./pages/admin/SubscriptionMonitoringPage.jsx'));
const SubscriptionLogsPage = React.lazy(() => import('./pages/admin/SubscriptionLogsPage.jsx'));
const ProvidersManagementPage = React.lazy(() => import('./pages/admin/ProvidersManagementPage.jsx'));
const ProviderOnboardingPage = React.lazy(() => import('./pages/admin/ProviderOnboardingPage.jsx'));
const BulkProviderUploadPage = React.lazy(() => import('./pages/admin/BulkProviderUploadPage.jsx'));
const FormBuilderPage = React.lazy(() => import('./pages/admin/FormBuilderPage.jsx'));
const FormResponsesPage = React.lazy(() => import('./pages/admin/FormResponsesPage.jsx'));
const KnowledgeBasePage = React.lazy(() => import('./pages/admin/KnowledgeBasePage.jsx'));
const AILogsPage = React.lazy(() => import('./pages/admin/AILogsPage.jsx'));
const SystemSettingsPage = React.lazy(() => import('./pages/admin/SystemSettingsPage.jsx'));

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
                <Route path="/auth/admin" element={<AuthAdminPage />} />

                <Route path="/admin" element={<AdminLandingPage />} />
                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route path="/forms/:formId" element={<FormSubmissionPage />} />

                <Route path="/admin/*" element={
                  <ProtectedAdminRoute>
                    <AdminLayout>
                      <Suspense fallback={<div className="flex h-[50vh] items-center justify-center"><LoadingSpinner size="lg" /></div>}>
                        <Routes>
                          <Route path="dashboard" element={<AdminDashboard />} />
                          <Route path="analytics/patients" element={<PatientsAnalyticsPage />} />
                          <Route path="analytics/employers" element={<EmployersAnalyticsPage />} />
                          <Route path="analytics/insurance" element={<AdminInsuranceAnalyticsPage />} />
                          <Route path="analytics/providers" element={<ProvidersAnalyticsPage />} />
                          <Route path="analytics/subscriptions" element={<SubscriptionsAnalyticsPage />} />
                          <Route path="analytics/financial" element={<FinancialAnalyticsPage />} />
                          <Route path="analytics/ai" element={<AIAnalyticsPage />} />
                          <Route path="analytics/forms" element={<FormsAnalyticsPage />} />
                          <Route path="patients" element={<PatientsManagementPage />} />
                          <Route path="employers" element={<EmployersManagementPage />} />
                          <Route path="insurance-users" element={<InsuranceUsersManagementPage />} />
                          <Route path="transactions" element={<TransactionsManagementPage />} />
                          <Route path="subscription-plans" element={<SubscriptionPlansPage />} />
                          <Route path="subscription-assignment" element={<SubscriptionAssignmentPage />} />
                          <Route path="subscription-monitoring" element={<SubscriptionMonitoringPage />} />
                          <Route path="subscription-logs" element={<SubscriptionLogsPage />} />
                          <Route path="providers" element={<ProvidersManagementPage />} />
                          <Route path="provider-onboarding" element={<ProviderOnboardingPage />} />
                          <Route path="bulk-provider-upload" element={<BulkProviderUploadPage />} />
                          <Route path="forms" element={<FormBuilderPage />} />
                          <Route path="forms/:formId/responses" element={<FormResponsesPage />} />
                          <Route path="knowledge-base" element={<KnowledgeBasePage />} />
                          <Route path="ai-logs" element={<AILogsPage />} />
                          <Route path="settings" element={<SystemSettingsPage />} />
                          <Route path="*" element={<div className="p-8 text-center text-muted-foreground">Module coming soon</div>} />
                        </Routes>
                      </Suspense>
                    </AdminLayout>
                  </ProtectedAdminRoute>
                } />

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