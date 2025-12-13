import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { ArrowLeft, Plus, Trash2, Save, ChevronDown, ChevronRight, Settings, Edit2 } from 'lucide-react';
import Modal from '../components/Modal';
import MediaManager from '../components/MediaManager';
import JsonConfigArea from '../components/JsonConfigArea';

// --- Component: Option Editor ---
const OptionEditor = ({ questionId, options }) => {
    const queryClient = useQueryClient();
    const [newOptionText, setNewOptionText] = useState('');
    const [newOptionConfig, setNewOptionConfig] = useState(null);
    const [expandedOptionId, setExpandedOptionId] = useState(null); // To toggle config view

    const createOptionMutation = useMutation({
        mutationFn: (data) => api.post(`/questions/${questionId}/options`, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['options', questionId]);
            setNewOptionText('');
            setNewOptionConfig(null);
        }
    });

    const deleteOptionMutation = useMutation({
        mutationFn: (id) => api.delete(`/options/${id}`),
        onSuccess: () => queryClient.invalidateQueries(['options', questionId])
    });

    const updateOptionMutation = useMutation({
        mutationFn: ({ id, data }) => api.patch(`/options/${id}`, data),
        onSuccess: () => queryClient.invalidateQueries(['options', questionId])
    });

    const attachMediaMutation = useMutation({
        mutationFn: ({ optionId, mediaId }) => api.post(`/options/${optionId}/media/${mediaId}`),
        onSuccess: () => queryClient.invalidateQueries(['options', questionId])
    });

    const detachMediaMutation = useMutation({
        mutationFn: ({ optionId, mediaId }) => api.delete(`/options/${optionId}/media/${mediaId}`),
        onSuccess: () => queryClient.invalidateQueries(['options', questionId])
    });

    const handleAdd = (e) => {
        e.preventDefault();
        if (!newOptionText.trim()) return;
        createOptionMutation.mutate({ 
            text: newOptionText, 
            isCorrect: false, 
            weight: 0,
            config: newOptionConfig
        });
    };

    return (
        <div className="mt-4 ml-8 p-4 bg-neo-bg border-2 border-neo-black shadow-sm">
            <h5 className="font-bold uppercase text-sm mb-2">Options</h5>
            <div className="space-y-4">
                {options?.map((opt) => (
                    <div key={opt.id} className="bg-neo-white border border-neo-black p-2">
                        <div className="flex items-start gap-2">
                            <input 
                                type="checkbox" 
                                checked={opt.isCorrect}
                                onChange={(e) => updateOptionMutation.mutate({ id: opt.id, data: { isCorrect: e.target.checked } })}
                                className="w-5 h-5 border-2 border-neo-black accent-neo-success cursor-pointer mt-1"
                            />
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="text" 
                                        value={opt.text || ''}
                                        onChange={(e) => updateOptionMutation.mutate({ id: opt.id, data: { text: e.target.value } })}
                                        className="flex-1 bg-transparent border-none focus:ring-0 font-medium"
                                    />
                                    <button 
                                        onClick={() => setExpandedOptionId(expandedOptionId === opt.id ? null : opt.id)}
                                        className={`p-1 border-2 ${expandedOptionId === opt.id ? 'bg-neo-main border-neo-black' : 'border-transparent hover:bg-gray-200'}`}
                                        title="Option Settings (JSON)"
                                    >
                                        <Settings size={16} />
                                    </button>
                                    <button 
                                        onClick={() => deleteOptionMutation.mutate(opt.id)}
                                        className="text-neo-error hover:text-neo-black"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                {expandedOptionId === opt.id && (
                                    <div className="mt-2 border-t border-gray-200 pt-2">
                                        <JsonConfigArea 
                                            value={opt.config}
                                            onChange={(newConfig) => updateOptionMutation.mutate({ id: opt.id, data: { config: newConfig } })}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Media Manager for Option */}
                        <div className="pl-7 mt-2">
                            <MediaManager 
                                attachedMedia={opt.media} // Assuming options returns enriched with media
                                onAttach={(mediaId) => attachMediaMutation.mutate({ optionId: opt.id, mediaId })}
                                onDetach={(mediaId) => detachMediaMutation.mutate({ optionId: opt.id, mediaId })}
                                contextType="Option"
                            />
                        </div>
                    </div>
                ))}
                
                {/* Add New Option Form */}
                <div className="border-2 border-dashed border-neo-black p-2">
                    <form onSubmit={handleAdd} className="flex gap-2 mb-2">
                        <input 
                            type="text" 
                            placeholder="New Option..."
                            value={newOptionText}
                            onChange={(e) => setNewOptionText(e.target.value)}
                            className="flex-1 p-1 border-2 border-neo-black text-sm"
                        />
                        <button type="submit" className="bg-neo-black text-neo-white px-3 text-sm font-bold hover:bg-gray-800">ADD</button>
                    </form>
                    <details className="text-xs">
                        <summary className="cursor-pointer font-bold text-gray-500 hover:text-neo-black">Optional Config (JSON)</summary>
                        <JsonConfigArea 
                            value={newOptionConfig} 
                            onChange={setNewOptionConfig} 
                        />
                    </details>
                </div>
            </div>
        </div>
    );
};

// --- Component: Question Item ---
const QuestionItem = ({ question: initialQuestion, sectionId }) => {
    const queryClient = useQueryClient();
    const [isExpanded, setIsExpanded] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    
    // Fetch full question details (including media) when expanded
    const { data: question } = useQuery({
        queryKey: ['question', initialQuestion.id],
        queryFn: async () => {
            const res = await api.get(`/questions/${initialQuestion.id}`);
            return res.data;
        },
        enabled: isExpanded,
        initialData: initialQuestion
    });

    const [editData, setEditData] = useState(question);

    // Fetch options if it's MCQ
    const isMCQ = ['scmcq', 'mcmcq'].includes(question.type);
    const { data: options } = useQuery({
        queryKey: ['options', question.id],
        queryFn: async () => {
            const res = await api.get(`/questions/${question.id}/options`);
            return res.data;
        },
        enabled: isMCQ && isExpanded
    });

    const updateQuestionMutation = useMutation({
        mutationFn: (data) => api.patch(`/questions/${question.id}`, data),
        onSuccess: () => {
            setIsEditing(false);
            queryClient.invalidateQueries(['questions', sectionId]);
            queryClient.invalidateQueries(['question', question.id]);
        }
    });

    const deleteQuestionMutation = useMutation({
        mutationFn: () => api.delete(`/questions/${question.id}`),
        onSuccess: () => queryClient.invalidateQueries(['questions', sectionId])
    });

    const attachMediaMutation = useMutation({
        mutationFn: (mediaId) => api.post(`/questions/${question.id}/media/${mediaId}`),
        onSuccess: () => queryClient.invalidateQueries(['question', question.id])
    });

    const detachMediaMutation = useMutation({
        mutationFn: (mediaId) => api.delete(`/questions/${question.id}/media/${mediaId}`),
        onSuccess: () => queryClient.invalidateQueries(['question', question.id])
    });

    const handleSave = () => {
        updateQuestionMutation.mutate(editData);
    };

    return (
        <div className="mb-4 bg-neo-white border-2 border-neo-black p-4 relative group">
             <div className="flex items-start gap-4">
                <button onClick={() => setIsExpanded(!isExpanded)} className="mt-1">
                    {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                </button>
                
                <div className="flex-1">
                    {isEditing ? (
                        <div className="space-y-3">
                            <textarea 
                                className="w-full p-2 border-2 border-neo-black font-bold"
                                value={editData.text}
                                onChange={(e) => setEditData({...editData, text: e.target.value})}
                            />
                             <div className="flex gap-4">
                                <select 
                                    className="p-2 border-2 border-neo-black bg-neo-white"
                                    value={editData.type}
                                    onChange={(e) => setEditData({...editData, type: e.target.value})}
                                >
                                    <option value="scmcq">Single Choice MCQ</option>
                                    <option value="mcmcq">Multiple Choice MCQ</option>
                                    <option value="numerical">Numerical</option>
                                    <option value="text">Text</option>
                                    <option value="file_upload">File Upload</option>
                                </select>
                                <input 
                                    type="number" 
                                    className="p-2 border-2 border-neo-black w-24" 
                                    placeholder="Score"
                                    value={editData.maxScore}
                                    onChange={(e) => setEditData({...editData, maxScore: parseFloat(e.target.value)})}
                                />
                            </div>
                            {/* Answer field for non-MCQ */}
                            {!['scmcq', 'mcmcq'].includes(editData.type) && (
                                <input 
                                    type="text" 
                                    className="w-full p-2 border-2 border-neo-black"
                                    placeholder="Correct Answer (Canonical)"
                                    value={editData.ans || ''}
                                    onChange={(e) => setEditData({...editData, ans: e.target.value})}
                                />
                            )}
                            
                            <JsonConfigArea 
                                value={editData.config}
                                onChange={(newConfig) => setEditData({...editData, config: newConfig})}
                            />

                            <div className="flex justify-end gap-2 mt-2">
                                <button onClick={() => setIsEditing(false)} className="neo-btn-secondary text-sm">Cancel</button>
                                <button onClick={handleSave} className="neo-btn text-sm">Save</button>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <div className="flex justify-between items-start">
                                <h4 className="font-bold text-lg">{question.text}</h4>
                                <div className="flex gap-2">
                                    <span className="bg-neo-main border border-neo-black px-2 text-xs font-bold uppercase flex items-center">{question.type}</span>
                                    <span className="bg-neo-warning border border-neo-black px-2 text-xs font-bold uppercase flex items-center">{question.maxScore} pts</span>
                                </div>
                            </div>
                            {!isExpanded && <p className="text-gray-500 text-sm truncate">Click to expand and edit options/details</p>}
                            {/* Show snippet of config if exists */}
                            {question.config && (
                                <div className="mt-1">
                                    <span className="text-[10px] bg-gray-200 px-1 rounded text-gray-600 font-mono">JSON Config Active</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {!isEditing && (
                    <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setIsEditing(true); setEditData(question); }} className="text-neo-main hover:text-neo-black font-bold">EDIT</button>
                        <button onClick={() => deleteQuestionMutation.mutate()} className="text-neo-error hover:text-neo-black font-bold">DEL</button>
                    </div>
                )}
             </div>

             {isExpanded && !isEditing && (
                 <div className="mt-4">
                    {/* Media Manager for Question */}
                    <div className="mb-4">
                        <MediaManager 
                            attachedMedia={question.media || []} // Assuming API returns media array
                            onAttach={(mediaId) => attachMediaMutation.mutate(mediaId)}
                            onDetach={(mediaId) => detachMediaMutation.mutate(mediaId)}
                            contextType="Question"
                        />
                    </div>

                    {isMCQ ? (
                        <OptionEditor questionId={question.id} options={options} />
                    ) : (
                        <div className="ml-8 p-4 bg-neo-bg border-2 border-neo-black">
                            <p className="font-bold">Correct Answer:</p>
                            <p>{question.ans || 'Not set'}</p>
                        </div>
                    )}
                 </div>
             )}
        </div>
    );
};

// --- Component: Section Item ---
const SectionItem = ({ section, testId }) => {
    const queryClient = useQueryClient();
    const [isExpanded, setIsExpanded] = useState(true);
    const [isAddingQuestion, setIsAddingQuestion] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [newQText, setNewQText] = useState('');
    const [newQType, setNewQType] = useState('scmcq');
    const [newQConfig, setNewQConfig] = useState(null);
    
    // Edit state for section
    const [editSectionData, setEditSectionData] = useState({ 
        title: section.title, 
        description: section.description,
        config: section.config
    });

    const { data: questions } = useQuery({
        queryKey: ['questions', section.id],
        queryFn: async () => {
            const res = await api.get(`/sections/${section.id}/questions`);
            return res.data;
        },
        enabled: isExpanded
    });

    const createQuestionMutation = useMutation({
        mutationFn: (data) => api.post(`/sections/${section.id}/questions`, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['questions', section.id]);
            setIsAddingQuestion(false);
            setNewQText('');
            setNewQConfig(null);
        }
    });
    
    const updateSectionMutation = useMutation({
        mutationFn: (data) => api.patch(`/sections/${section.id}`, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['sections', testId]);
            setIsEditing(false);
        }
    });

    const deleteSectionMutation = useMutation({
        mutationFn: () => api.delete(`/sections/${section.id}`),
        onSuccess: () => queryClient.invalidateQueries(['sections', testId])
    });

    const handleAddQuestion = (e) => {
        e.preventDefault();
        createQuestionMutation.mutate({ 
            text: newQText, 
            type: newQType, 
            maxScore: 1,
            config: newQConfig
        });
    };

    const handleUpdateSection = (e) => {
        e.preventDefault();
        updateSectionMutation.mutate(editSectionData);
    };

    return (
        <div className="mb-8">
            <div className="bg-neo-black text-neo-white p-4 flex justify-between items-center shadow-[5px_5px_0px_0px_rgba(0,0,0,0.2)]">
                {isEditing ? (
                    <div className="flex-1 mr-4 bg-neo-white p-2 text-neo-black">
                        <input 
                            className="w-full font-bold text-xl mb-2 bg-transparent border-b-2 border-neo-black outline-none"
                            value={editSectionData.title}
                            onChange={(e) => setEditSectionData({...editSectionData, title: e.target.value})}
                        />
                        <textarea 
                            className="w-full mb-2 bg-transparent border-b-2 border-neo-black outline-none"
                            value={editSectionData.description || ''}
                            onChange={(e) => setEditSectionData({...editSectionData, description: e.target.value})}
                            placeholder="Description"
                        />
                        <JsonConfigArea 
                            value={editSectionData.config}
                            onChange={(newConfig) => setEditSectionData({...editSectionData, config: newConfig})}
                        />
                        <div className="flex justify-end gap-2 mt-2">
                            <button onClick={() => setIsEditing(false)} className="text-xs font-bold uppercase border-2 border-neo-black px-2 py-1 hover:bg-gray-200">Cancel</button>
                            <button onClick={handleUpdateSection} className="text-xs font-bold uppercase bg-neo-main border-2 border-neo-black px-2 py-1 hover:bg-neo-accent">Save</button>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsExpanded(!isExpanded)}>
                            {isExpanded ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                        </button>
                        <h3 className="text-xl font-black uppercase tracking-wider">{section.title}</h3>
                        {section.config && <span className="text-[10px] bg-white/20 px-1 rounded">JSON</span>}
                    </div>
                )}
                
                <div className="flex gap-2">
                     {!isEditing && (
                        <button onClick={() => { setIsEditing(true); setEditSectionData(section); }} className="text-neo-white hover:text-neo-main transition-colors">
                            <Edit2 size={20} />
                        </button>
                     )}
                    <button onClick={() => {
                        if(window.confirm('Delete section and all its questions?')) deleteSectionMutation.mutate();
                    }} className="text-neo-error hover:text-white transition-colors">
                        <Trash2 size={20} />
                    </button>
                </div>
            </div>
            
            {isExpanded && !isEditing && (
                <div className="border-l-4 border-neo-black ml-6 pl-6 pt-6 pb-2">
                    <p className="mb-6 text-gray-600 italic border-b-2 border-gray-300 pb-2">{section.description || 'No description provided.'}</p>
                    
                    {questions?.map(q => (
                        <QuestionItem key={q.id} question={q} sectionId={section.id} />
                    ))}

                    {isAddingQuestion ? (
                        <div className="bg-neo-white border-2 border-neo-black p-4 shadow-neo animate-in fade-in zoom-in duration-150">
                            <h4 className="font-black uppercase mb-4">New Question</h4>
                            <form onSubmit={handleAddQuestion} className="space-y-4">
                                <textarea 
                                    placeholder="Question Text..." 
                                    className="neo-input"
                                    value={newQText}
                                    onChange={e => setNewQText(e.target.value)}
                                    autoFocus
                                    required
                                />
                                <div className="flex gap-4">
                                     <select 
                                        className="neo-input"
                                        value={newQType}
                                        onChange={e => setNewQType(e.target.value)}
                                    >
                                        <option value="scmcq">Single Choice MCQ</option>
                                        <option value="mcmcq">Multiple Choice MCQ</option>
                                        <option value="numerical">Numerical</option>
                                        <option value="text">Text</option>
                                        <option value="file_upload">File Upload</option>
                                    </select>
                                </div>
                                
                                <JsonConfigArea 
                                    value={newQConfig} 
                                    onChange={setNewQConfig} 
                                />

                                <div className="flex justify-end gap-2">
                                    <button type="button" onClick={() => setIsAddingQuestion(false)} className="neo-btn-secondary">Cancel</button>
                                    <button type="submit" className="neo-btn">Create</button>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <button 
                            onClick={() => setIsAddingQuestion(true)}
                            className="w-full py-4 border-2 border-dashed border-neo-black hover:bg-neo-bg transition-colors font-bold uppercase text-gray-500 hover:text-neo-black flex justify-center items-center gap-2"
                        >
                            <Plus size={20} /> Add Question
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

// --- Main Component: Test Editor ---
const TestEditor = () => {
  const { id } = useParams();
    const _navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAddSectionOpen, setIsAddSectionOpen] = useState(false);
  const [isEditTestOpen, setIsEditTestOpen] = useState(false); // State for Test Edit Modal
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [newSectionDesc, setNewSectionDesc] = useState('');
  const [newSectionConfig, setNewSectionConfig] = useState(null);
  const [testEditData, setTestEditData] = useState({});

  const { data: test, isLoading: isTestLoading } = useQuery({
    queryKey: ['test', id],
    queryFn: async () => {
      const res = await api.get(`/tests/${id}`);
      return res.data;
    }
  });

  const { data: sections, isLoading: isSectionsLoading } = useQuery({
    queryKey: ['sections', id],
    queryFn: async () => {
      const res = await api.get(`/tests/${id}/sections`);
      return res.data;
    }
  });

  const createSectionMutation = useMutation({
    mutationFn: (data) => api.post(`/tests/${id}/sections`, data),
    onSuccess: () => {
        queryClient.invalidateQueries(['sections', id]);
        setIsAddSectionOpen(false);
        setNewSectionTitle('');
        setNewSectionDesc('');
        setNewSectionConfig(null);
    }
  });

  const updateTestMutation = useMutation({
    mutationFn: (data) => api.patch(`/tests/${id}`, data),
    onSuccess: () => {
        queryClient.invalidateQueries(['test', id]);
        setIsEditTestOpen(false);
    },
    onError: (err) => {
        alert('Failed to update test settings: ' + (err.response?.data?.message || err.message));
    }
  });

  const handleCreateSection = (e) => {
    e.preventDefault();
    const orderIndex = (sections?.length || 0) + 1;
    createSectionMutation.mutate({ 
        title: newSectionTitle, 
        description: newSectionDesc, 
        orderIndex,
        config: newSectionConfig
    });
  };

  const handleUpdateTest = (e) => {
      e.preventDefault();
      updateTestMutation.mutate(testEditData);
  };

  const openEditTestModal = () => {
      setTestEditData({
          title: test.title,
          description: test.description,
          isActive: test.isActive,
          duration: test.duration,
          allowNegativeMarking: test.allowNegativeMarking,
          allowPartialMarking: test.allowPartialMarking,
          shuffleQuestions: test.shuffleQuestions,
          shuffleOptions: test.shuffleOptions,
          test_specific_info: test.test_specific_info
      });
      setIsEditTestOpen(true);
  };

  if (isTestLoading || isSectionsLoading) return <div className="p-8 font-bold text-xl animate-pulse">Loading Editor...</div>;

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-neo-white border-4 border-neo-black shadow-neo p-6 mb-8 flex justify-between items-start">
        <div>
            <div className="flex items-center gap-4 mb-2">
                <Link to="/tests" className="neo-btn-secondary p-2 rounded-none"><ArrowLeft size={20} /></Link>
                <h1 className="text-3xl font-black uppercase">{test.title}</h1>
            </div>
            <p className="text-gray-600 font-medium max-w-3xl">{test.description}</p>
            <div className="flex gap-4 mt-4">
                <span className={`px-2 py-1 border-2 border-neo-black font-bold uppercase text-sm ${test.isActive ? 'bg-neo-success' : 'bg-gray-300'}`}>
                    {test.isActive ? 'Active' : 'Draft'}
                </span>
                <span className="px-2 py-1 border-2 border-neo-black font-bold uppercase text-sm bg-neo-bg">
                    Duration: {test.duration}s
                </span>
                {test.test_specific_info && (
                    <span className="px-2 py-1 border-2 border-neo-black font-bold uppercase text-sm bg-blue-100 flex items-center gap-1">
                        <Settings size={12} /> JSON Config
                    </span>
                )}
            </div>
        </div>
        <button 
            onClick={openEditTestModal}
            className="neo-btn flex items-center gap-2"
        >
            <Settings size={20} /> Test Settings
        </button>
      </div>

      {/* Sections List */}
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black uppercase bg-neo-main inline-block px-4 py-2 border-2 border-neo-black shadow-neo-sm">Test Sections</h2>
            <button 
                onClick={() => setIsAddSectionOpen(true)}
                className="neo-btn flex items-center gap-2"
            >
                <Plus size={20} /> Add Section
            </button>
        </div>

        {sections?.map(section => (
            <SectionItem key={section.id} section={section} testId={id} />
        ))}

        {(!sections || sections.length === 0) && (
            <div className="text-center p-12 border-4 border-dashed border-neo-black opacity-50">
                <h3 className="text-xl font-bold mb-2">No Sections Yet</h3>
                <p>Add a section to start building your test.</p>
            </div>
        )}
      </div>

      {/* Add Section Modal */}
      <Modal isOpen={isAddSectionOpen} onClose={() => setIsAddSectionOpen(false)} title="Add New Section">
         <form onSubmit={handleCreateSection} className="space-y-4">
            <div>
                <label className="block font-bold mb-2">Section Title</label>
                <input 
                    type="text" 
                    className="neo-input"
                    value={newSectionTitle}
                    onChange={e => setNewSectionTitle(e.target.value)}
                    required 
                />
            </div>
            <div>
                <label className="block font-bold mb-2">Description</label>
                <textarea 
                    className="neo-input"
                    value={newSectionDesc}
                    onChange={e => setNewSectionDesc(e.target.value)}
                />
            </div>

            <JsonConfigArea 
                value={newSectionConfig} 
                onChange={setNewSectionConfig} 
            />

            <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={() => setIsAddSectionOpen(false)} className="neo-btn-secondary">Cancel</button>
                <button type="submit" className="neo-btn">Create Section</button>
            </div>
         </form>
      </Modal>

      {/* Edit Test Settings Modal */}
      <Modal isOpen={isEditTestOpen} onClose={() => setIsEditTestOpen(false)} title="Edit Test Settings">
          <form onSubmit={handleUpdateTest} className="space-y-4">
            <div>
                <label className="block font-bold mb-2">Title</label>
                <input 
                    type="text" 
                    className="neo-input"
                    value={testEditData.title || ''}
                    onChange={e => setTestEditData({...testEditData, title: e.target.value})}
                    required 
                />
            </div>
            <div>
                <label className="block font-bold mb-2">Description</label>
                <textarea 
                    className="neo-input min-h-[80px]"
                    value={testEditData.description || ''}
                    onChange={e => setTestEditData({...testEditData, description: e.target.value})}
                />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block font-bold mb-2">Duration (seconds)</label>
                    <input 
                        type="number" 
                        className="neo-input"
                        value={testEditData.duration || 0}
                        onChange={e => setTestEditData({...testEditData, duration: parseInt(e.target.value)})}
                    />
                </div>
                <div className="flex items-center pt-8">
                    <label className="flex items-center gap-2 font-bold cursor-pointer select-none">
                        <input 
                            type="checkbox" 
                            className="w-6 h-6 border-2 border-neo-black rounded-none accent-neo-main"
                            checked={testEditData.isActive || false}
                            onChange={(e) => setTestEditData({...testEditData, isActive: e.target.checked})}
                        />
                        Is Active
                    </label>
                </div>
            </div>

            <JsonConfigArea 
                value={testEditData.test_specific_info} 
                onChange={(newConfig) => setTestEditData({...testEditData, test_specific_info: newConfig})}
                label="Test Specific Info (JSON)" 
            />

            <div className="border-t-2 border-neo-black pt-4 mt-4 grid grid-cols-2 gap-4">
                <label className="flex items-center gap-2 font-bold cursor-pointer">
                    <input type="checkbox" className="w-5 h-5 accent-neo-main" checked={testEditData.allowNegativeMarking || false} onChange={e => setTestEditData({...testEditData, allowNegativeMarking: e.target.checked})} />
                    Negative Marking
                </label>
                <label className="flex items-center gap-2 font-bold cursor-pointer">
                    <input type="checkbox" className="w-5 h-5 accent-neo-main" checked={testEditData.allowPartialMarking || false} onChange={e => setTestEditData({...testEditData, allowPartialMarking: e.target.checked})} />
                    Partial Marking
                </label>
                <label className="flex items-center gap-2 font-bold cursor-pointer">
                    <input type="checkbox" className="w-5 h-5 accent-neo-main" checked={testEditData.shuffleQuestions || false} onChange={e => setTestEditData({...testEditData, shuffleQuestions: e.target.checked})} />
                    Shuffle Questions
                </label>
                <label className="flex items-center gap-2 font-bold cursor-pointer">
                    <input type="checkbox" className="w-5 h-5 accent-neo-main" checked={testEditData.shuffleOptions || false} onChange={e => setTestEditData({...testEditData, shuffleOptions: e.target.checked})} />
                    Shuffle Options
                </label>
            </div>

            <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={() => setIsEditTestOpen(false)} className="neo-btn-secondary">Cancel</button>
                <button type="submit" className="neo-btn">Save Changes</button>
            </div>
          </form>
      </Modal>
    </div>
  );
};

export default TestEditor;
