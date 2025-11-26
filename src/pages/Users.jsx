import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Trash2, Plus, UserPlus } from 'lucide-react';
import Modal from '../components/Modal';

const Users = () => {
  const [page, setPage] = useState(0);
  const limit = 10;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    type: 'participant'
  });

  const { data, isLoading } = useQuery({
    queryKey: ['users', page],
    queryFn: async () => {
      const res = await api.get(`/users?limit=${limit}&offset=${page * limit}`);
      return res.data;
    }
  });

  const createUserMutation = useMutation({
    mutationFn: (newUser) => api.post('/users', newUser),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      setIsModalOpen(false);
      setFormData({ name: '', email: '', password: '', type: 'participant' });
    },
    onError: (error) => {
        alert('Error creating user: ' + (error.response?.data?.message || error.message));
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: (userId) => api.delete(`/users/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    createUserMutation.mutate(formData);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      deleteUserMutation.mutate(id);
    }
  };

  if (isLoading) return <div>Loading users...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-4xl font-black uppercase">User Management</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="neo-btn flex items-center gap-2"
        >
          <UserPlus size={20} />
          Add User
        </button>
      </div>

      <div className="bg-neo-white border-2 border-neo-black shadow-neo overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neo-black text-neo-white">
              <th className="p-4 font-bold uppercase text-sm">ID</th>
              <th className="p-4 font-bold uppercase text-sm">Name</th>
              <th className="p-4 font-bold uppercase text-sm">Email</th>
              <th className="p-4 font-bold uppercase text-sm">Type</th>
              <th className="p-4 font-bold uppercase text-sm text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data?.items?.map((user) => (
              <tr key={user.id} className="border-b-2 border-neo-black hover:bg-neo-bg transition-colors">
                <td className="p-4 font-mono font-bold">{user.id}</td>
                <td className="p-4 font-bold">{user.name}</td>
                <td className="p-4">{user.email}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 border-2 border-neo-black text-xs font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                    user.type === 'admin' ? 'bg-neo-error' : 
                    user.type === 'tester' ? 'bg-neo-warning' : 'bg-neo-success'
                  }`}>
                    {user.type}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button 
                    onClick={() => handleDelete(user.id)}
                    className="p-2 bg-neo-white border-2 border-neo-black hover:bg-neo-error hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                    title="Delete User"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
            {(!data?.items || data.items.length === 0) && (
                 <tr>
                    <td colSpan="5" className="p-8 text-center font-bold text-gray-500">No users found.</td>
                 </tr>
            )}
          </tbody>
        </table>
        
        <div className="p-4 border-t-2 border-neo-black flex justify-between items-center bg-neo-white">
            <button 
                disabled={page === 0}
                onClick={() => setPage(p => Math.max(0, p - 1))}
                className="neo-btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Previous
            </button>
            <span className="font-bold">Page {page + 1} of {Math.ceil((data?.total || 0) / limit)}</span>
            <button 
                disabled={!data || (page + 1) * limit >= data.total}
                onClick={() => setPage(p => p + 1)}
                className="neo-btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Next
            </button>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Create New User"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-bold mb-2">Full Name</label>
            <input 
              type="text" 
              className="neo-input"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              required
            />
          </div>
          
          <div>
            <label className="block font-bold mb-2">Email Address</label>
            <input 
              type="email" 
              className="neo-input"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required
            />
          </div>

          <div>
            <label className="block font-bold mb-2">Password</label>
            <input 
              type="password" 
              className="neo-input"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required
            />
          </div>

          <div>
            <label className="block font-bold mb-2">User Type</label>
            <select 
              className="neo-input"
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
            >
              <option value="participant">Participant</option>
              <option value="tester">Tester</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-4">
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)}
              className="neo-btn-secondary"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="neo-btn"
              disabled={createUserMutation.isPending}
            >
              {createUserMutation.isPending ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Users;

