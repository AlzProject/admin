import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { ArrowLeft, Eye } from 'lucide-react';

const TestAttempts = () => {
    const { id } = useParams();
    
    // Fetch Test Info
    const { data: test, isLoading: testLoading } = useQuery({
        queryKey: ['test', id],
        queryFn: async () => {
            const res = await api.get(`/tests/${id}`);
            return res.data;
        }
    });

    // Fetch Attempts for this Test (client-side filtering for now as API doesn't support test_id query param yet)
    const { data: attemptsData, isLoading: attemptsLoading } = useQuery({
        queryKey: ['attempts', 'test', id],
        queryFn: async () => {
            // Fetch more attempts to ensure we catch them if client-side filtering
            const res = await api.get(`/attempts?limit=100`); 
            return res.data;
        }
    });

    if (testLoading || attemptsLoading) return <div className="p-8 font-bold animate-pulse">Loading Attempts...</div>;

    // Filter
    const attempts = attemptsData?.items?.filter(a => a.testId === parseInt(id));

    return (
        <div className="pb-20">
            <div className="bg-neo-white border-4 border-neo-black shadow-neo p-6 mb-8">
                <div className="flex items-center gap-4 mb-2">
                    <Link to="/tests" className="neo-btn-secondary p-2 rounded-none"><ArrowLeft size={20} /></Link>
                    <div>
                        <h1 className="text-3xl font-black uppercase">Attempts: {test.title}</h1>
                        <p className="text-gray-600 font-bold">Total Attempts: {attempts?.length || 0}</p>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto border-2 border-neo-black bg-neo-white shadow-neo">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-neo-black text-neo-white">
                            <th className="p-4 font-bold uppercase text-sm">Attempt ID</th>
                            <th className="p-4 font-bold uppercase text-sm">User ID</th>
                            <th className="p-4 font-bold uppercase text-sm">Status</th>
                            <th className="p-4 font-bold uppercase text-sm">Score</th>
                            <th className="p-4 font-bold uppercase text-sm">Started At</th>
                            <th className="p-4 font-bold uppercase text-sm text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {attempts?.map(attempt => (
                            <tr key={attempt.id} className="border-b border-neo-black hover:bg-neo-bg transition-colors">
                                <td className="p-4 font-mono font-bold">{attempt.id}</td>
                                <td className="p-4 font-mono">{attempt.userId}</td>
                                <td className="p-4">
                                    <span className={`px-2 py-1 border-2 border-neo-black text-xs font-bold uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                                        attempt.status === 'graded' ? 'bg-neo-success' : 
                                        attempt.status === 'submitted' ? 'bg-neo-warning' : 'bg-gray-300'
                                    }`}>
                                        {attempt.status}
                                    </span>
                                </td>
                                <td className="p-4 font-black text-lg">{attempt.totalScore ?? '-'}</td>
                                <td className="p-4 text-sm font-bold text-gray-600">
                                    {new Date(attempt.startedAt).toLocaleString()}
                                </td>
                                <td className="p-4 text-right">
                                    <Link 
                                        to={`/attempts/${attempt.id}`}
                                        className="neo-btn-secondary px-3 py-1 text-xs flex items-center gap-2 inline-flex"
                                    >
                                        <Eye size={14} /> View Details
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {(!attempts || attempts.length === 0) && (
                            <tr>
                                <td colSpan="6" className="p-8 text-center text-gray-500 italic font-bold">
                                    No attempts recorded for this test yet.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default TestAttempts;

