import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { Trash2, Plus, Edit, FileEdit, Eye } from 'lucide-react';
import Modal from '../components/Modal';
import JsonConfigArea from '../components/JsonConfigArea';

const Tests = () => {
  const [page, setPage] = useState(0);
  const limit = 10;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const queryClient = useQueryClient();

  // Form state
  const initialFormState = {
    title: '',
    description: '',
    duration: 60, // Default 60 mins
    isActive: true,
    allowNegativeMarking: false,
    allowPartialMarking: false,
    shuffleQuestions: false,
    shuffleOptions: false,
    test_specific_info: null
  };
  
  const [formData, setFormData] = useState(initialFormState);

  const { data, isLoading } = useQuery({
    queryKey: ['tests', page],
    queryFn: async () => {
      const res = await api.get(`/tests?limit=${limit}&offset=${page * limit}`);
      return res.data;
    }
  });

  const createTestMutation = useMutation({
    mutationFn: (newTest) => api.post('/tests', newTest),
    onSuccess: () => {
      queryClient.invalidateQueries(['tests']);
      closeModal();
    },
    onError: (error) => {
        alert('Error creating test: ' + (error.response?.data?.message || error.message));
    }
  });

  const updateTestMutation = useMutation({
    mutationFn: ({ id, data }) => api.patch(`/tests/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['tests']);
      closeModal();
    },
    onError: (error) => {
        alert('Error updating test: ' + (error.response?.data?.message || error.message));
    }
  });

  const deleteTestMutation = useMutation({
    mutationFn: (testId) => api.delete(`/tests/${testId}`),
    onSuccess: () => {
      queryClient.invalidateQueries(['tests']);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Ensure duration is integer
    const payload = {
        ...formData,
        duration: parseInt(formData.duration)
    };

    if (editingTest) {
      updateTestMutation.mutate({ id: editingTest.id, data: payload });
    } else {
      createTestMutation.mutate(payload);
    }
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this test?')) {
      deleteTestMutation.mutate(id);
    }
  };

  const openCreateModal = () => {
    setEditingTest(null);
    setFormData(initialFormState);
    setIsModalOpen(true);
  };

  const openEditModal = (test) => {
    setEditingTest(test);
    setFormData({
        title: test.title,
        description: test.description || '',
        duration: test.duration || 0,
        isActive: test.isActive,
        allowNegativeMarking: test.allowNegativeMarking,
        allowPartialMarking: test.allowPartialMarking,
        shuffleQuestions: test.shuffleQuestions,
        shuffleOptions: test.shuffleOptions,
        test_specific_info: test.test_specific_info
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTest(null);
    setFormData(initialFormState);
  };

  if (isLoading) return <div>Loading tests...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-4xl font-black uppercase">Test Management</h2>
        <button 
          onClick={openCreateModal}
          className="neo-btn flex items-center gap-2"
        >
          <Plus size={20} />
          Create Test
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {data?.items?.map((test) => (
          <div key={test.id} className="bg-neo-white border-2 border-neo-black shadow-neo p-6 flex justify-between items-start hover:shadow-neo-hover transition-all">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold">{test.title}</h3>
                    {test.isActive ? (
                        <span className="bg-neo-success border-2 border-neo-black text-xs font-bold px-2 py-1 uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Active</span>
                    ) : (
                        <span className="bg-gray-300 border-2 border-neo-black text-xs font-bold px-2 py-1 uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">Draft</span>
                    )}
                </div>
                <p className="text-gray-600 mb-4 font-medium max-w-2xl">{test.description}</p>
                <div className="flex gap-4 text-sm font-bold text-gray-500">
                    <span>⏱ {test.duration ? `${test.duration}s` : 'No limit'}</span>
                    <span>📅 {new Date(test.createdAt).toLocaleDateString()}</span>
                </div>
            </div>
            <div className="flex gap-2">
                <Link 
                    to={`/tests/${test.id}`}
                    className="p-2 bg-neo-white border-2 border-neo-black hover:bg-neo-main hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center"
                    title="Manage Questions & Sections"
                >
                    <FileEdit size={20} />
                </Link>
                <Link 
                    to={`/tests/${test.id}/attempts`}
                    className="p-2 bg-neo-white border-2 border-neo-black hover:bg-neo-accent hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center"
                    title="View Attempts"
                >
                    <Eye size={20} />
                </Link>
                <button 
                    onClick={() => openEditModal(test)}
                    className="p-2 bg-neo-white border-2 border-neo-black hover:bg-neo-warning hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                    title="Edit Test Settings"
                >
                    <Edit size={20} />
                </button>
                <button 
                    onClick={() => handleDelete(test.id)}
                    className="p-2 bg-neo-white border-2 border-neo-black hover:bg-neo-error hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                    title="Delete Test"
                >
                    <Trash2 size={20} />
                </button>
            </div>
          </div>
        ))}
        
        {(!data?.items || data.items.length === 0) && (
            <div className="p-8 text-center font-bold text-gray-500 border-2 border-neo-black bg-neo-white shadow-neo">
                No tests found. Create one to get started!
            </div>
        )}
      </div>

      {/* Pagination (Simplified) */}
      <div className="mt-8 flex justify-between items-center">
            <button 
                disabled={page === 0}
                onClick={() => setPage(p => Math.max(0, p - 1))}
                className="neo-btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Previous
            </button>
            <span className="font-bold">Page {page + 1}</span>
            <button 
                disabled={!data || (page + 1) * limit >= data.total}
                onClick={() => setPage(p => p + 1)}
                className="neo-btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
                Next
            </button>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={editingTest ? "Edit Test" : "Create New Test"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-bold mb-2">Title</label>
            <input 
              type="text" 
              className="neo-input"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              required
            />
          </div>
          
          <div>
            <label className="block font-bold mb-2">Description</label>
            <textarea 
              className="neo-input min-h-[100px]"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <JsonConfigArea 
            value={formData.test_specific_info} 
            onChange={(newConfig) => setFormData({...formData, test_specific_info: newConfig})} 
            label="Test Specific Info (JSON)"
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
                <label className="block font-bold mb-2">Duration (seconds)</label>
                <input 
                type="number" 
                className="neo-input"
                value={formData.duration}
                onChange={(e) => setFormData({...formData, duration: e.target.value})}
                />
            </div>
             <div className="flex items-center pt-8">
                <label className="flex items-center gap-2 font-bold cursor-pointer select-none">
                    <input 
                        type="checkbox" 
                        className="w-6 h-6 border-2 border-neo-black rounded-none accent-neo-main"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({...formData, isActive: e.target.checked})}
                    />
                    Is Active
                </label>
            </div>
          </div>

          <div className="border-t-2 border-neo-black pt-4 mt-4">
            <h4 className="font-black uppercase mb-4">Settings</h4>
            <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 font-bold cursor-pointer select-none">
                    <input 
                        type="checkbox" 
                        className="w-5 h-5 border-2 border-neo-black rounded-none accent-neo-main"
                        checked={formData.allowNegativeMarking}
                        onChange={(e) => setFormData({...formData, allowNegativeMarking: e.target.checked})}
                    />
                    Negative Marking
                </label>
                <label className="flex items-center gap-2 font-bold cursor-pointer select-none">
                    <input 
                        type="checkbox" 
                        className="w-5 h-5 border-2 border-neo-black rounded-none accent-neo-main"
                        checked={formData.allowPartialMarking}
                        onChange={(e) => setFormData({...formData, allowPartialMarking: e.target.checked})}
                    />
                    Partial Marking
                </label>
                <label className="flex items-center gap-2 font-bold cursor-pointer select-none">
                    <input 
                        type="checkbox" 
                        className="w-5 h-5 border-2 border-neo-black rounded-none accent-neo-main"
                        checked={formData.shuffleQuestions}
                        onChange={(e) => setFormData({...formData, shuffleQuestions: e.target.checked})}
                    />
                    Shuffle Questions
                </label>
                <label className="flex items-center gap-2 font-bold cursor-pointer select-none">
                    <input 
                        type="checkbox" 
                        className="w-5 h-5 border-2 border-neo-black rounded-none accent-neo-main"
                        checked={formData.shuffleOptions}
                        onChange={(e) => setFormData({...formData, shuffleOptions: e.target.checked})}
                    />
                    Shuffle Options
                </label>
            </div>
          </div>

          <div className="pt-6 flex justify-end gap-4">
            <button 
              type="button" 
              onClick={closeModal}
              className="neo-btn-secondary"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="neo-btn"
              disabled={createTestMutation.isPending || updateTestMutation.isPending}
            >
              {editingTest ? 'Update Test' : 'Create Test'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Tests;
