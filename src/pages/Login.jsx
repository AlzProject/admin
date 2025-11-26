import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError('Invalid credentials. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-neo-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-neo-white border-4 border-neo-black shadow-neo p-8">
        <h2 className="text-4xl font-black mb-6 text-center uppercase">Login</h2>
        
        {error && (
          <div className="bg-neo-error border-2 border-neo-black p-3 mb-6 font-bold flex items-center justify-between shadow-neo-sm">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block font-bold mb-2 text-lg">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="neo-input"
              placeholder="admin@example.com"
              required
            />
          </div>
          
          <div>
            <label className="block font-bold mb-2 text-lg">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="neo-input"
              placeholder="••••••••"
              required
            />
          </div>

          <button 
            type="submit"
            className="w-full neo-btn text-lg uppercase tracking-wider"
          >
            Enter Dashboard
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

