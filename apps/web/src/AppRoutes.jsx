import React, { Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ScrollToTop from './components/ScrollToTop.jsx';
import ProtectedRoleRoute from './components/ProtectedRoleRoute.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';
import PatientLayout from './components/PatientLayout.jsx';

import RoleSelectionLandingPage from './views/RoleSelectionLandingPage.jsx';
import AuthIndividualPage from './views/AuthIndividualPage.jsx';
import AuthResetPasswordRequiredPage from './views/AuthResetPasswordRequiredPage.jsx';
import AuthEmployerPage from './views/AuthEmployerPage.jsx';
import AuthInsurancePage from './views/AuthInsurancePage.jsx';
import AuthAdminPage from './views/AuthAdminPage.jsx';
import NotFoundPage from './views/NotFoundPage.jsx';
import FormSubmissionPage from './views/FormSubmissionPage.jsx';
import ProviderServicesIntakePage from './views/ProviderServicesIntakePage.jsx';
import ProtectedAdminRoute from './components/admin/ProtectedAdminRoute.jsx';
import AdminLayout from './components/admin/AdminLayout.jsx';
import AdminLandingPage from './views/admin/AdminLandingPage.jsx';
import AdminLoginPage from './views/admin/AdminLoginPage.jsx';
import AdminDashboard from './views/admin/AdminDashboard.jsx';

import PatientHealthRecordsPage from './views/PatientHealthRecordsPage.jsx';

const PatientOnboardingPage = React.lazy(() => import('./views/PatientOnboardingPage.jsx'));
const PatientDashboardPage = React.lazy(() => import('./views/PatientDashboardPage.jsx'));
const AIRecommendationsPage = React.lazy(() => import('./views/AIRecommendationsPage.jsx'));
const MarketplaceSearchPage = React.lazy(() => import('./views/MarketplaceSearchPage.jsx'));
const BookingPage = React.lazy(() => import('./views/BookingPage.jsx'));
const PatientAppointmentsPage = React.lazy(() => import('./views/PatientAppointmentsPage.jsx'));
const PatientPrescriptionsPage = React.lazy(() => import('./views/PatientPrescriptionsPage.jsx'));
const PatientMessagesPage = React.lazy(() => import('./views/PatientMessagesPage.jsx'));

const PharmacyPage = React.lazy(() => import('./views/PharmacyPage.jsx'));
const TelemedicinePage = React.lazy(() => import('./views/TelemedicinePage.jsx'));
const HealthGoalsPage = React.lazy(() => import('./views/HealthGoalsPage.jsx'));

const EmployerOnboardingPage = React.lazy(() => import('./views/EmployerOnboardingPage.jsx'));
const EmployerDashboardPage = React.lazy(() => import('./views/EmployerDashboardPage.jsx'));
const EmployeeManagementPage = React.lazy(() => import('./views/EmployeeManagementPage.jsx'));
const EmployerAnalyticsPage = React.lazy(() => import('./views/EmployerAnalyticsPage.jsx'));
const EmployerCostsPage = React.lazy(() => import('./views/EmployerCostsPage.jsx'));
const EmployerMessagingPage = React.lazy(() => import('./views/EmployerMessagingPage.jsx'));
const EmployerSettingsPage = React.lazy(() => import('./views/EmployerSettingsPage.jsx'));
const BulkOnboardingPage = React.lazy(() => import('./views/BulkOnboardingPage.jsx'));
const EmployerContractsPage = React.lazy(() => import('./views/EmployerContractsPage.jsx'));

const InsuranceDashboardPage = React.lazy(() => import('./views/InsuranceDashboardPage.jsx'));
const InsuranceMembersOutcomesPage = React.lazy(() => import('./views/InsuranceMembersOutcomesPage.jsx'));
const InsuranceContractsPage = React.lazy(() => import('./views/InsuranceContractsPage.jsx'));
const InsuranceGenericsPage = React.lazy(() => import('./views/InsuranceGenericsPage.jsx'));
const InsurancePaymentsPage = React.lazy(() => import('./views/InsurancePaymentsPage.jsx'));
const InsuranceAnalyticsPage = React.lazy(() => import('./views/InsuranceAnalyticsPage.jsx'));
const InsuranceSettingsPage = React.lazy(() => import('./views/InsuranceSettingsPage.jsx'));

const PatientsAnalyticsPage = React.lazy(() => import('./views/admin/analytics/PatientsAnalyticsPage.jsx'));
const EmployersAnalyticsPage = React.lazy(() => import('./views/admin/analytics/EmployersAnalyticsPage.jsx'));
const AdminInsuranceAnalyticsPage = React.lazy(() => import('./views/admin/analytics/InsuranceAnalyticsPage.jsx'));
const ProvidersAnalyticsPage = React.lazy(() => import('./views/admin/analytics/ProvidersAnalyticsPage.jsx'));
const SubscriptionsAnalyticsPage = React.lazy(() => import('./views/admin/analytics/SubscriptionsAnalyticsPage.jsx'));
const FinancialAnalyticsPage = React.lazy(() => import('./views/admin/analytics/FinancialAnalyticsPage.jsx'));
const AIAnalyticsPage = React.lazy(() => import('./views/admin/analytics/AIAnalyticsPage.jsx'));
const FormsAnalyticsPage = React.lazy(() => import('./views/admin/analytics/FormsAnalyticsPage.jsx'));
const PatientsManagementPage = React.lazy(() => import('./views/admin/PatientsManagementPage.jsx'));
const EmployersManagementPage = React.lazy(() => import('./views/admin/EmployersManagementPage.jsx'));
const InsuranceUsersManagementPage = React.lazy(() => import('./views/admin/InsuranceUsersManagementPage.jsx'));
const TransactionsManagementPage = React.lazy(() => import('./views/admin/TransactionsManagementPage.jsx'));
const SubscriptionPlansPage = React.lazy(() => import('./views/admin/SubscriptionPlansPage.jsx'));
const SubscriptionAssignmentPage = React.lazy(() => import('./views/admin/SubscriptionAssignmentPage.jsx'));
const SubscriptionMonitoringPage = React.lazy(() => import('./views/admin/SubscriptionMonitoringPage.jsx'));
const SubscriptionLogsPage = React.lazy(() => import('./views/admin/SubscriptionLogsPage.jsx'));
const ProvidersManagementPage = React.lazy(() => import('./views/admin/ProvidersManagementPage.jsx'));
const ProviderOnboardingPage = React.lazy(() => import('./views/admin/ProviderOnboardingPage.jsx'));
const ProviderTypesPage = React.lazy(() => import('./views/admin/ProviderTypesPage.jsx'));
const AppointmentOptionsPage = React.lazy(() => import('./views/admin/AppointmentOptionsPage.jsx'));
const ProfileReferenceDataPage = React.lazy(() => import('./views/admin/ProfileReferenceDataPage.jsx'));
const BulkProviderUploadPage = React.lazy(() => import('./views/admin/BulkProviderUploadPage.jsx'));
const BulkImportsHubPage = React.lazy(() => import('./views/admin/BulkImportsHubPage.jsx'));
const EmployerEmployeeRosterPage = React.lazy(() => import('./views/admin/EmployerEmployeeRosterPage.jsx'));
const ProviderServicesPage = React.lazy(() => import('./views/admin/ProviderServicesPage.jsx'));
const ProviderServicesIntakePreviewPage = React.lazy(() =>
	import('./views/admin/ProviderServicesIntakePreviewPage.jsx')
);
const FormBuilderPage = React.lazy(() => import('./views/admin/FormBuilderPage.jsx'));
const FormResponsesPage = React.lazy(() => import('./views/admin/FormResponsesPage.jsx'));
const FormResponsesHubPage = React.lazy(() => import('./views/admin/FormResponsesHubPage.jsx'));
const KnowledgeBasePage = React.lazy(() => import('./views/admin/KnowledgeBasePage.jsx'));
const AILogsPage = React.lazy(() => import('./views/admin/AILogsPage.jsx'));

const ProviderDashboard = React.lazy(() => import('./views/ProviderDashboard.jsx'));
const ProviderAppointmentsPage = React.lazy(() => import('./views/ProviderAppointmentsPage.jsx'));
const PatientManagementPage = React.lazy(() => import('./views/PatientManagementPage.jsx'));
const ProviderMessagingPage = React.lazy(() => import('./views/ProviderMessagingPage.jsx'));

export default function AppRoutes() {
	return (
		<>
			<ScrollToTop />
			<Suspense
				fallback={
					<div className="h-screen w-full flex items-center justify-center bg-background">
						<LoadingSpinner size="lg" />
					</div>
				}
			>
				<Routes>
					<Route path="/" element={<RoleSelectionLandingPage />} />
					<Route path="/auth/individual" element={<AuthIndividualPage />} />
					<Route path="/auth/reset-password-required" element={<AuthResetPasswordRequiredPage />} />
					<Route path="/auth/employer" element={<AuthEmployerPage />} />
					<Route path="/auth/insurance" element={<AuthInsurancePage />} />
					<Route path="/auth/admin" element={<AuthAdminPage />} />

					<Route path="/admin" element={<AdminLandingPage />} />
					<Route path="/admin/login" element={<AdminLoginPage />} />
					<Route path="/forms/:formId" element={<FormSubmissionPage />} />
					<Route path="/provider-onboarding/services" element={<ProviderServicesIntakePage />} />

					<Route
						path="/admin/*"
						element={
							<ProtectedAdminRoute>
								<AdminLayout>
									<Suspense
										fallback={
											<div className="flex h-[50vh] items-center justify-center">
												<LoadingSpinner size="lg" />
											</div>
										}
									>
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
											<Route path="provider-types" element={<ProviderTypesPage />} />
											<Route path="appointment-options" element={<AppointmentOptionsPage />} />
											<Route path="profile-reference-data" element={<ProfileReferenceDataPage />} />
											<Route path="bulk-imports" element={<BulkImportsHubPage />} />
											<Route path="employer-employees" element={<EmployerEmployeeRosterPage />} />
											<Route
												path="bulk-employees"
												element={<Navigate to="/admin/bulk-imports?tab=employees" replace />}
											/>
											<Route path="bulk-provider-upload" element={<BulkProviderUploadPage />} />
											<Route path="provider-services" element={<ProviderServicesPage />} />
											<Route
												path="preview/provider-services-intake"
												element={<ProviderServicesIntakePreviewPage />}
											/>
											<Route path="form-responses" element={<FormResponsesHubPage />} />
											<Route path="forms" element={<FormBuilderPage />} />
											<Route path="forms/:formId/responses" element={<FormResponsesPage />} />
											<Route path="knowledge-base" element={<KnowledgeBasePage />} />
											<Route path="ai-logs" element={<AILogsPage />} />
											<Route
												path="*"
												element={
													<div className="p-8 text-center text-muted-foreground">Module coming soon</div>
												}
											/>
										</Routes>
									</Suspense>
								</AdminLayout>
							</ProtectedAdminRoute>
						}
					/>

					<Route
						path="/patient/*"
						element={
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
										<Route path="messages" element={<PatientMessagesPage />} />
										<Route path="pharmacy" element={<PharmacyPage />} />
										<Route path="telemedicine" element={<TelemedicinePage />} />
										<Route path="health-goals" element={<HealthGoalsPage />} />
									</Routes>
								</PatientLayout>
							</ProtectedRoleRoute>
						}
					/>

					<Route
						path="/employer/onboarding"
						element={
							<ProtectedRoleRoute requiredRole="employer">
								<EmployerOnboardingPage />
							</ProtectedRoleRoute>
						}
					/>
					<Route
						path="/employer/dashboard"
						element={
							<ProtectedRoleRoute requiredRole="employer">
								<EmployerDashboardPage />
							</ProtectedRoleRoute>
						}
					/>
					<Route
						path="/employer/employees"
						element={
							<ProtectedRoleRoute requiredRole="employer">
								<EmployeeManagementPage />
							</ProtectedRoleRoute>
						}
					/>
					<Route
						path="/employer/analytics"
						element={
							<ProtectedRoleRoute requiredRole="employer">
								<EmployerAnalyticsPage />
							</ProtectedRoleRoute>
						}
					/>
					<Route
						path="/employer/costs"
						element={
							<ProtectedRoleRoute requiredRole="employer">
								<EmployerCostsPage />
							</ProtectedRoleRoute>
						}
					/>
					<Route
						path="/employer/messaging"
						element={
							<ProtectedRoleRoute requiredRole="employer">
								<EmployerMessagingPage />
							</ProtectedRoleRoute>
						}
					/>
					<Route
						path="/employer/settings"
						element={
							<ProtectedRoleRoute requiredRole="employer">
								<EmployerSettingsPage />
							</ProtectedRoleRoute>
						}
					/>
					<Route
						path="/employer/bulk-onboarding"
						element={
							<ProtectedRoleRoute requiredRole="employer">
								<BulkOnboardingPage />
							</ProtectedRoleRoute>
						}
					/>
					<Route
						path="/employer/contracts"
						element={
							<ProtectedRoleRoute requiredRole="employer">
								<EmployerContractsPage />
							</ProtectedRoleRoute>
						}
					/>

					<Route
						path="/insurance/dashboard"
						element={
							<ProtectedRoleRoute requiredRole="insurance">
								<InsuranceDashboardPage />
							</ProtectedRoleRoute>
						}
					/>
					<Route
						path="/insurance/members"
						element={
							<ProtectedRoleRoute requiredRole="insurance">
								<InsuranceMembersOutcomesPage />
							</ProtectedRoleRoute>
						}
					/>
					<Route
						path="/insurance/contracts"
						element={
							<ProtectedRoleRoute requiredRole="insurance">
								<InsuranceContractsPage />
							</ProtectedRoleRoute>
						}
					/>
					<Route
						path="/insurance/generics"
						element={
							<ProtectedRoleRoute requiredRole="insurance">
								<InsuranceGenericsPage />
							</ProtectedRoleRoute>
						}
					/>
					<Route
						path="/insurance/payments"
						element={
							<ProtectedRoleRoute requiredRole="insurance">
								<InsurancePaymentsPage />
							</ProtectedRoleRoute>
						}
					/>
					<Route
						path="/insurance/analytics"
						element={
							<ProtectedRoleRoute requiredRole="insurance">
								<InsuranceAnalyticsPage />
							</ProtectedRoleRoute>
						}
					/>
					<Route
						path="/insurance/settings"
						element={
							<ProtectedRoleRoute requiredRole="insurance">
								<InsuranceSettingsPage />
							</ProtectedRoleRoute>
						}
					/>

					<Route
						path="/provider/dashboard"
						element={
							<ProtectedRoleRoute requiredRole="provider">
								<ProviderDashboard />
							</ProtectedRoleRoute>
						}
					/>
					<Route
						path="/provider/appointments"
						element={
							<ProtectedRoleRoute requiredRole="provider">
								<ProviderAppointmentsPage />
							</ProtectedRoleRoute>
						}
					/>
					<Route
						path="/provider/patients"
						element={
							<ProtectedRoleRoute requiredRole="provider">
								<PatientManagementPage />
							</ProtectedRoleRoute>
						}
					/>
					<Route
						path="/provider/messaging"
						element={
							<ProtectedRoleRoute requiredRole="provider">
								<ProviderMessagingPage />
							</ProtectedRoleRoute>
						}
					/>

					<Route path="*" element={<NotFoundPage />} />
				</Routes>
			</Suspense>
		</>
	);
}
