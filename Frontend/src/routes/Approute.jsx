import React, { Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import Loader from '../components/Loader';
import { ProtectedRoute, GuestRoute } from '../components/ProtectedRoute';

const SectionPage = React.lazy(() => import('../pages/SectionPage'));
const Home = React.lazy(() => import('../pages/Home'));
const SearchOverlay = React.lazy(() => import('../components/SearchOverlay'));
const TVPage = React.lazy(() => import('../pages/TVPage'));
const CartoonPage = React.lazy(() => import('../pages/CartoonPage'));
const AnimePage = React.lazy(() => import('../pages/AnimePage'));
const DetailsPage = React.lazy(() => import('../pages/DetailsPage'));
const PersonPage = React.lazy(() => import('../pages/PersonPage'));

const LoginPage = React.lazy(() => import('../pages/LoginPage'));
const SignupPage = React.lazy(() => import('../pages/SignupPage'));
const ProfilePage = React.lazy(() => import('../pages/ProfilePage'));

// Admin Dashboard Components
const AdminRoute = React.lazy(() => import('../components/AdminRoute'));
const AdminLayout = React.lazy(() => import('../pages/Admin/AdminLayout'));
const AdminDashboard = React.lazy(() => import('../pages/Admin/AdminDashboard'));
const AdminUsers = React.lazy(() => import('../pages/Admin/AdminUsers'));
const AdminAnalytics = React.lazy(() => import('../pages/Admin/AdminAnalytics'));
const AdminContent = React.lazy(() => import('../pages/Admin/AdminContent'));
const AdminWatch = React.lazy(() => import('../pages/Admin/AdminWatch'));
const AdminSettings = React.lazy(() => import('../pages/Admin/AdminSettings'));
const AdminAds = React.lazy(() => import('../pages/Admin/AdminAds'));

const Approute = () => {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/cartoon' element={<CartoonPage />} />
        <Route path='/tv' element={<TVPage />} />
        <Route path='/anime' element={<AnimePage />} />
        <Route path='/movie/:id' element={<DetailsPage type="movie" />} />
        <Route path='/cartoon/:id' element={<DetailsPage type="cartoon" />} />
        <Route path='/tv/:id' element={<DetailsPage type="tv" />} />
        <Route path='/anime/:id' element={<DetailsPage type="anime" />} />
        <Route path='/person/:id' element={<PersonPage />} />
        {/* Fallback for existing links using details/:type/:id */}
        <Route path='/details/:type/:id' element={<DetailsPage />} />
        <Route path='/movies/:section' element={<SectionPage type="movies" />} />
        <Route path='/cartoon/:section' element={<SectionPage type="cartoon" />} />
        <Route path='/tv/:section' element={<SectionPage type="tv" />} />
        <Route path='/anime/:section' element={<SectionPage type="anime" />} />
        <Route path='/search' element={<SearchOverlay />} />
        
        {/* Auth Guest Routes */}
        <Route path='/login' element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path='/signup' element={<GuestRoute><SignupPage /></GuestRoute>} />
        
        {/* Auth Protected Routes */}
        <Route path='/profile' element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

        {/* Admin Dashboard Protected Routes */}
        <Route path='/admin' element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<AdminDashboard />} />
          <Route path='users' element={<AdminUsers />} />
          <Route path='analytics' element={<AdminAnalytics />} />
          <Route path='content' element={<AdminContent />} />
          <Route path='watch' element={<AdminWatch />} />
          <Route path='settings' element={<AdminSettings />} />
          <Route path='ads' element={<AdminAds />} />
        </Route>
      </Routes>
    </Suspense>
  )
}

export default Approute;