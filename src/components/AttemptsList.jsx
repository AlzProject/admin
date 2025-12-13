import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Eye } from 'lucide-react';

const AttemptsList = ({ testId }) => {
    const [page, _setPage] = useState(0);
    const limit = 10;

    const { data, isLoading } = useQuery({
        queryKey: ['attempts', testId, page],
        queryFn: async () => {
            // Assuming backend might support filtering by test_id if added, or we filter client side?
            // The spec has /attempts?user_id=... but not test_id. 
            // It might return all attempts if no filter.
            // For now, let's just list all attempts and client-side filter if needed, or rely on backend update.
            // Or maybe we just list recent attempts globally for now if testId is not supported.
            // Ideally, the backend should support test_id filter. Let's assume it does or we just show all for now.
            const res = await api.get(`/attempts?limit=${limit}&offset=${page * limit}`);
            return res.data;
        }
    });

    if (isLoading) return <div className="p-4 font-bold">Loading attempts...</div>;

    // Client-side filter if API doesn't support test_id (for safety based on current spec)
    const items = testId ? data?.items?.filter(a => a.testId === parseInt(testId)) : data?.items;

    return (
        <div className="mt-8 border-t-4 border-neo-black pt-8">
            <h3 className="text-2xl font-black uppercase mb-4">Recent Attempts</h3>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-2 border-neo-black bg-neo-white">
                    <thead>
                        <tr className="bg-neo-black text-neo-white">
                            <th className="p-3 font-bold uppercase text-xs">ID</th>
                            <th className="p-3 font-bold uppercase text-xs">User ID</th>
                            <th className="p-3 font-bold uppercase text-xs">Status</th>
                            <th className="p-3 font-bold uppercase text-xs">Score</th>
                            <th className="p-3 font-bold uppercase text-xs">Time</th>
                            <th className="p-3 font-bold uppercase text-xs text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items?.map(attempt => (
                            <tr key={attempt.id} className="border-b border-neo-black hover:bg-neo-bg">
                                <td className="p-3 font-mono font-bold">{attempt.id}</td>
                                <td className="p-3 font-mono">{attempt.userId}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-0.5 border border-neo-black text-xs font-bold uppercase ${
                                        attempt.status === 'graded' ? 'bg-neo-success' : 
                                        attempt.status === 'submitted' ? 'bg-neo-warning' : 'bg-gray-300'
                                    }`}>
                                        {attempt.status}
                                    </span>
                                </td>
                                <td className="p-3 font-black">{attempt.totalScore ?? '-'}</td>
                                <td className="p-3 text-sm text-gray-600">
                                    {new Date(attempt.startedAt).toLocaleDateString()}
                                </td>
                                <td className="p-3 text-right">
                                    <Link 
                                        to={`/attempts/${attempt.id}`}
                                        className="inline-flex items-center gap-1 px-2 py-1 bg-neo-white border border-neo-black shadow-neo-sm hover:translate-y-0.5 hover:shadow-none transition-all text-xs font-bold uppercase"
                                    >
                                        <Eye size={14} /> View
                                    </Link>
                                </td>
                            </tr>
                        ))}
                        {(!items || items.length === 0) && (
                            <tr>
                                <td colSpan="6" className="p-4 text-center text-gray-500 italic">No attempts found.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AttemptsList;

