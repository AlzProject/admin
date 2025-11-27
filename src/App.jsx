import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Tests from './pages/Tests';
import TestEditor from './pages/TestEditor';
import TestAttempts from './pages/TestAttempts';
import AttemptDetails from './pages/AttemptDetails';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/users" element={<Users />} />
            <Route path="/tests" element={<Tests />} />
            <Route path="/tests/:id" element={<TestEditor />} />
            <Route path="/tests/:id/attempts" element={<TestAttempts />} />
            <Route path="/attempts/:id" element={<AttemptDetails />} />
          </Route>
        </Route>
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
