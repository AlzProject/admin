import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { Search, User, ClipboardList, Activity, ArrowRight } from 'lucide-react';

const PatientStats = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(null);

  // Fetch users (assuming up to 100 or paginated - we will just fetch a large batch for client side filtering)
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users', 'all-patients'],
    queryFn: async () => {
      const res = await api.get(`/users?limit=1000&offset=0`);
      return res.data;
    }
  });

  // Filter patients only
  const patients = useMemo(() => {
    if (!usersData?.items) return [];
    let p = usersData.items.filter(u => u.type === 'participant');
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      p = p.filter(u => u.name?.toLowerCase().includes(lower) || u.email?.toLowerCase().includes(lower));
    }
    return p;
  }, [usersData, searchTerm]);

  // Fetch specific user's info
  const { data: userDetails, isLoading: isLoadingUser } = useQuery({
    queryKey: ['users', selectedUserId],
    queryFn: async () => {
      const res = await api.get(`/users/${selectedUserId}`);
      return res.data;
    },
    enabled: !!selectedUserId
  });

  // Fetch attempts for the specific user
  const { data: attemptsData, isLoading: isLoadingAttempts } = useQuery({
    queryKey: ['attempts', selectedUserId],
    queryFn: async () => {
      const res = await api.get(`/attempts?user_id=${selectedUserId}&limit=100`);
      
      // Fetch score reports to get accurate scores for submitted/graded tests
      const items = await Promise.all(
        res.data.items.map(async (attempt) => {
          if (attempt.status === 'submitted' || attempt.status === 'graded') {
            try {
              const scoreRes = await api.get(`/reports/attempt/${attempt.id}/score`);
              return { 
                ...attempt, 
                totalScore: scoreRes.data.total_score,
                status: scoreRes.data.attempt.status || attempt.status
              };
            } catch {
              console.error('Failed to fetch score for attempt', attempt.id);
            }
          }
          return attempt;
        })
      );
      
      return { ...res.data, items };
    },
    enabled: !!selectedUserId
  });

  // Fetch tests to map testId to title
  const { data: testsData } = useQuery({
    queryKey: ['tests', 'all'],
    queryFn: async () => {
      const res = await api.get('/tests?limit=1000');
      return res.data;
    },
    enabled: !!selectedUserId
  });

  const getTestTitle = (testId) => {
    if (!testsData?.items) return `Test #${testId}`;
    const test = testsData.items.find(t => t.id === testId);
    return test ? test.title : `Test #${testId}`;
  };

  const renderInfoValue = (value) => {
    if (!value) return String(value);
    let parsedValue = value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (typeof parsed === 'object' && parsed !== null) {
          parsedValue = parsed;
        }
      } catch (e) {
        // Not a JSON string
      }
    }

    if (Array.isArray(parsedValue)) {
      if (parsedValue.length === 0) return 'None';
      if (typeof parsedValue[0] === 'object') {
        return (
          <div className="flex flex-col gap-3 my-1">
            {parsedValue.map((item, idx) => (
              <div key={idx} className="p-3 bg-white border border-gray-300 shadow-sm rounded-md space-y-1">
                {Object.entries(item).map(([ik, iv]) => (
                  <div key={ik} className="text-sm flex flex-col sm:flex-row sm:gap-2">
                    <span className="font-bold text-gray-700 capitalize w-1/3">{ik.replace(/([A-Z])/g, ' $1').trim()}:</span>
                    <span className="text-gray-900 flex-1">{String(iv || '—')}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        );
      }
      return parsedValue.join(', ');
    }

    if (typeof parsedValue === 'object' && parsedValue !== null) {
      return (
        <div className="flex flex-col gap-1 my-1 p-2 bg-gray-50 border border-gray-200 rounded-md">
          {Object.entries(parsedValue).map(([ik, iv]) => (
            <div key={ik} className="text-sm flex gap-2">
              <span className="font-bold text-gray-700 capitalize">{ik.replace(/([A-Z])/g, ' $1').trim()}:</span>
              <span>{typeof iv === 'object' ? JSON.stringify(iv) : String(iv || '—')}</span>
            </div>
          ))}
        </div>
      );
    }

    return String(value);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* LEFT PANEL: PATIENT LIST */}
      <div className="w-1/3 flex flex-col bg-neo-white border-2 border-neo-black shadow-neo overflow-hidden">
        <div className="p-4 border-b-2 border-neo-black bg-neo-bg flex flex-col gap-4">
          <h2 className="text-2xl font-black uppercase flex items-center gap-2">
            <User size={24} /> Patients
          </h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Search patients..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="neo-input w-full !pl-10 py-2 text-sm"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoadingUsers ? (
            <div className="text-center font-bold">Loading patients...</div>
          ) : patients.length === 0 ? (
            <div className="text-center text-gray-500 font-bold">No patients found.</div>
          ) : (
            patients.map(p => (
              <div 
                key={p.id}
                onClick={() => setSelectedUserId(p.id)}
                className={`p-3 border-2 border-neo-black font-bold cursor-pointer transition-all ${
                  selectedUserId === p.id 
                    ? 'bg-neo-main shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] -translate-y-1' 
                    : 'bg-white hover:bg-neo-bg hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1'
                }`}
              >
                <div>{p.name}</div>
                <div className="text-xs font-normal text-gray-700 mt-1">{p.email}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RIGHT PANEL: STATS & DETAILS */}
      <div className="flex-1 flex flex-col gap-6">
        {!selectedUserId ? (
          <div className="flex-1 flex items-center justify-center bg-neo-white border-2 border-neo-black shadow-neo">
            <div className="text-center text-gray-500 font-bold text-xl flex flex-col items-center gap-4">
              <Activity size={48} className="text-neo-black" />
              Select a patient to view stats
            </div>
          </div>
        ) : isLoadingUser || isLoadingAttempts ? (
          <div className="flex-1 flex items-center justify-center bg-neo-white border-2 border-neo-black shadow-neo">
            <div className="text-xl font-bold">Loading patient data...</div>
          </div>
        ) : (
          <>
            {/* User Info Table */}
            <div className="bg-neo-white border-2 border-neo-black shadow-neo flex flex-col flex-1 min-h-0">
              <div className="p-4 border-b-2 border-neo-black bg-neo-black text-neo-white shrink-0">
                <h3 className="text-xl font-black uppercase flex items-center gap-2">
                  <ClipboardList size={20} />
                  Patient Information
                </h3>
              </div>
              <div className="p-0 overflow-y-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <tbody>
                    <tr className="border-b-2 border-neo-black">
                      <th className="p-3 font-bold bg-neo-bg w-1/3">Name</th>
                      <td className="p-3 font-medium">{userDetails?.name}</td>
                    </tr>
                    <tr className="border-b-2 border-neo-black">
                      <th className="p-3 font-bold bg-neo-bg w-1/3">Email</th>
                      <td className="p-3 font-medium">{userDetails?.email}</td>
                    </tr>
                    <tr className="border-b-2 border-neo-black">
                      <th className="p-3 font-bold bg-neo-bg w-1/3">Joined</th>
                      <td className="p-3 font-medium">
                        {userDetails?.createdAt && new Date(userDetails.createdAt).toLocaleString()}
                      </td>
                    </tr>
                    {/* Render specific user info as additional rows */}
                    {userDetails?.user_specific_info && Object.entries(userDetails.user_specific_info).map(([k, v]) => (
                      <tr key={k} className="border-b-2 border-neo-black">
                        <th className="p-3 font-bold bg-neo-bg w-1/3 capitalize text-wrap">{k.replace(/_/g, ' ')}</th>
                        <td className="p-3 font-medium align-top">
                          {renderInfoValue(v)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Test Scores Table */}
            <div className="bg-neo-white border-2 border-neo-black shadow-neo flex flex-col flex-1 min-h-0">
              <div className="p-4 border-b-2 border-neo-black bg-neo-black text-neo-white shrink-0">
                <h3 className="text-xl font-black uppercase flex items-center gap-2">
                  <Activity size={20} />
                  Test Scores
                </h3>
              </div>
              <div className="p-0 overflow-y-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-neo-bg border-b-2 border-neo-black">
                      <th className="p-3 font-bold uppercase text-sm">Test Name</th>
                      <th className="p-3 font-bold uppercase text-sm">Status</th>
                      <th className="p-3 font-bold uppercase text-sm">Date</th>
                      <th className="p-3 font-bold uppercase text-sm text-right">Score</th>
                      <th className="p-3 font-bold uppercase text-sm text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!attemptsData?.items || attemptsData.items.length === 0) ? (
                      <tr>
                        <td colSpan="5" className="p-6 text-center font-bold text-gray-500">
                          No test attempts found for this patient.
                        </td>
                      </tr>
                    ) : (
                      attemptsData.items.map(attempt => (
                        <tr key={attempt.id} className="border-b-2 border-neo-black hover:bg-neutral-50 transition-colors">
                          <td className="p-3 font-bold">{getTestTitle(attempt.testId)}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 border-2 border-neo-black text-xs font-bold uppercase ${
                              attempt.status === 'graded' ? 'bg-neo-success text-black' : 
                              attempt.status === 'submitted' ? 'bg-neo-warning text-black' : 
                              'bg-gray-200 text-black'
                            }`}>
                              {attempt.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-3 font-medium">
                            {new Date(attempt.startedAt).toLocaleDateString()}
                          </td>
                          <td className="p-3 font-mono font-bold text-lg text-right w-16">
                            {attempt.totalScore != null ? Number(attempt.totalScore).toFixed(2) : '-'}
                          </td>
                          <td className="p-3 text-right">
                            {attempt.status === 'submitted' ? (
                              <Link 
                                to={`/attempts/${attempt.id}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-neo-warning border-2 border-neo-black font-bold text-xs uppercase hover:bg-yellow-400 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                              >
                                Grade
                                <ArrowRight size={14} />
                              </Link>
                            ) : attempt.status === 'graded' ? (
                              <Link 
                                to={`/attempts/${attempt.id}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-neo-bg border-2 border-neo-black font-bold text-xs uppercase hover:bg-gray-200 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all"
                              >
                                View
                                <ArrowRight size={14} />
                              </Link>
                            ) : null}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PatientStats;