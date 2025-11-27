import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, Clock, Save } from 'lucide-react';
import { useState } from 'react';

// --- Component: Response Item ---
const ResponseItem = ({ response, question, manualGradingMutation }) => {
    const [score, setScore] = useState(response.score || 0);
    const [comment, setComment] = useState('');
    const [isEditing, setIsEditing] = useState(false);

    const isCorrect = response.score === question.maxScore;
    const isPartial = response.score > 0 && response.score < question.maxScore;
    const isWrong = response.score <= 0 && response.evaluated;
    const needsGrading = !response.evaluated;

    const handleGrade = () => {
        manualGradingMutation.mutate({
            responseId: response.id,
            score: parseFloat(score),
            comment
        });
        setIsEditing(false);
    };

    // Render Answer Content based on type
    const renderAnswer = () => {
        if (question.type === 'file_upload') {
            return (
                <div className="bg-gray-100 p-2 border border-neo-black inline-block">
                    <span className="font-bold text-sm">File Uploaded: </span>
                    {response.answerText ? (
                        <a href={response.answerText} target="_blank" rel="noopener noreferrer" className="text-neo-main hover:underline font-mono">
                            View File
                        </a>
                    ) : <span className="text-gray-500 italic">No file link available</span>}
                </div>
            );
        }
        
        if (['scmcq', 'mcmcq'].includes(question.type)) {
             // We need to map selectedOptionIds to actual text if we have options data, 
             // but usually report endpoint might just give IDs. 
             // For now, let's show the text if available in response or just IDs.
             // The spec says 'answerText' might be populated or 'selectedOptionIds'.
             if (response.selectedOptionIds && response.selectedOptionIds.length > 0) {
                 return <div className="font-mono bg-gray-100 p-2 border border-neo-black">Selected Options: {response.selectedOptionIds.join(', ')}</div>;
             }
        }

        return <div className="font-mono bg-gray-100 p-2 border border-neo-black whitespace-pre-wrap">{response.answerText || '(No answer provided)'}</div>;
    };

    return (
        <div className="bg-neo-white border-2 border-neo-black p-4 mb-4 shadow-sm">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h4 className="font-bold text-lg mb-1">{question.text}</h4>
                    <div className="flex gap-2 text-xs uppercase font-bold text-gray-500">
                        <span>Type: {question.type}</span>
                        <span>Max: {question.maxScore} pts</span>
                    </div>
                </div>
                <div className="text-right">
                    {needsGrading ? (
                        <span className="inline-flex items-center gap-1 bg-neo-warning border border-neo-black px-2 py-1 text-xs font-bold uppercase">
                            <AlertCircle size={14} /> Needs Grading
                        </span>
                    ) : (
                        <span className={`inline-flex items-center gap-1 border border-neo-black px-2 py-1 text-xs font-bold uppercase ${isCorrect ? 'bg-neo-success' : isPartial ? 'bg-yellow-200' : 'bg-neo-error text-white'}`}>
                            {isCorrect ? <CheckCircle size={14} /> : isWrong ? <XCircle size={14} /> : <AlertCircle size={14} />}
                            {response.score} / {question.maxScore}
                        </span>
                    )}
                </div>
            </div>

            <div className="mb-4">
                <p className="font-bold text-sm uppercase mb-1 text-gray-600">User Response:</p>
                {renderAnswer()}
            </div>

            {/* Grading Interface */}
            <div className="border-t-2 border-dotted border-gray-300 pt-4 mt-2">
                {isEditing ? (
                    <div className="bg-neo-bg p-4 border border-neo-black">
                        <h5 className="font-bold uppercase text-sm mb-2">Manual Grading</h5>
                        <div className="flex gap-4 mb-2">
                            <div className="flex-1">
                                <label className="block text-xs font-bold mb-1">Score</label>
                                <input 
                                    type="number" 
                                    className="neo-input w-full"
                                    value={score}
                                    onChange={e => setScore(e.target.value)}
                                    max={question.maxScore}
                                />
                            </div>
                            <div className="flex-[3]">
                                <label className="block text-xs font-bold mb-1">Comment (Optional)</label>
                                <input 
                                    type="text" 
                                    className="neo-input w-full"
                                    value={comment}
                                    onChange={e => setComment(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setIsEditing(false)} className="neo-btn-secondary text-xs">Cancel</button>
                            <button onClick={handleGrade} className="neo-btn text-xs flex items-center gap-1">
                                <Save size={14} /> Save Grade
                            </button>
                        </div>
                    </div>
                ) : (
                    <button 
                        onClick={() => setIsEditing(true)}
                        className="text-xs font-bold underline hover:text-neo-main"
                    >
                        {needsGrading ? 'Grade this response' : 'Override Grade'}
                    </button>
                )}
            </div>
        </div>
    );
};

// --- Main Page: Attempt Details ---
const AttemptDetails = () => {
    const { id } = useParams();
    const queryClient = useQueryClient();

    // Fetch full attempt report (score + responses + hierarchy)
    // The API has /reports/attempt/{attemptId}/score which returns { attempt, responses, total_score }
    // We also need the test structure (sections/questions) to map responses to questions efficiently.
    // We can fetch the test structure separately or rely on the report if it includes it (Spec says it returns attempt & responses)
    // We'll fetch Test details as well.
    
    const { data: report, isLoading: reportLoading } = useQuery({
        queryKey: ['attemptReport', id],
        queryFn: async () => {
            const res = await api.get(`/reports/attempt/${id}/score`);
            return res.data;
        }
    });

    // Fetch Test Structure to display questions even if no response or to show question text
    // We need testId from report first.
    const testId = report?.attempt?.testId;
    
    const { data: testStructure, isLoading: testLoading } = useQuery({
        queryKey: ['testStructure', testId],
        queryFn: async () => {
            // We need full structure. The /tests/{id} gives minimal sections.
            // Ideally we need /tests/{id}/sections then /sections/{id}/questions.
            // For simplicity, let's just fetch sections and their questions in parallel or waterfall.
            // A better API design would be /tests/{id}?include=full_structure
            
            const testRes = await api.get(`/tests/${testId}`);
            const sectionsRes = await api.get(`/tests/${testId}/sections`);
            const sections = sectionsRes.data;
            
            // Fetch questions for all sections
            const sectionsWithQuestions = await Promise.all(sections.map(async (sec) => {
                const qRes = await api.get(`/sections/${sec.id}/questions`);
                return { ...sec, questions: qRes.data };
            }));

            return { ...testRes.data, sections: sectionsWithQuestions };
        },
        enabled: !!testId
    });

    const manualGradingMutation = useMutation({
        mutationFn: (data) => api.post('/grading/manual', data),
        onSuccess: () => {
            queryClient.invalidateQueries(['attemptReport', id]);
        },
        onError: (err) => alert('Grading failed: ' + err.message)
    });

    if (reportLoading || (testId && testLoading)) return <div className="p-8 font-bold text-xl animate-pulse">Loading Report...</div>;
    if (!report) return <div className="p-8">Report not found.</div>;

    // Map responses by questionId for easy lookup
    const responseMap = new Map(report.responses.map(r => [r.questionId, r]));

    return (
        <div className="pb-20">
            {/* Header */}
            <div className="bg-neo-white border-4 border-neo-black shadow-neo p-6 mb-8">
                <div className="flex items-center gap-4 mb-4">
                    <Link to="/tests" className="neo-btn-secondary p-2 rounded-none"><ArrowLeft size={20} /></Link>
                    <div>
                        <h1 className="text-3xl font-black uppercase">Attempt #{report.attempt.id}</h1>
                        <p className="text-gray-600 font-bold">User ID: {report.attempt.userId}</p>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-t-2 border-neo-black pt-4">
                    <div>
                        <span className="block text-xs font-bold uppercase text-gray-500">Total Score</span>
                        <span className="text-3xl font-black text-neo-main">{report.total_score}</span>
                    </div>
                    <div>
                        <span className="block text-xs font-bold uppercase text-gray-500">Status</span>
                        <span className={`inline-block px-2 py-1 text-sm font-bold uppercase border-2 border-neo-black ${report.attempt.status === 'graded' ? 'bg-neo-success' : 'bg-neo-warning'}`}>
                            {report.attempt.status}
                        </span>
                    </div>
                    <div>
                        <span className="block text-xs font-bold uppercase text-gray-500">Started At</span>
                        <span className="font-mono font-bold">{new Date(report.attempt.startedAt).toLocaleString()}</span>
                    </div>
                    <div>
                        <span className="block text-xs font-bold uppercase text-gray-500">Duration</span>
                        <span className="font-mono font-bold flex items-center gap-1">
                            <Clock size={16} />
                            {report.attempt.submittedAt 
                                ? Math.round((new Date(report.attempt.submittedAt) - new Date(report.attempt.startedAt)) / 60000) + ' min' 
                                : 'In Progress'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Detailed Report */}
            <div className="space-y-8">
                {testStructure?.sections?.map((section) => (
                    <div key={section.id} className="border-l-4 border-neo-black pl-6">
                        <h3 className="text-2xl font-black uppercase mb-4">{section.title}</h3>
                        
                        {section.questions?.map((question) => {
                            const response = responseMap.get(question.id) || {};
                            return (
                                <ResponseItem 
                                    key={question.id} 
                                    question={question} 
                                    response={response} 
                                    manualGradingMutation={manualGradingMutation}
                                />
                            );
                        })}
                        
                        {(!section.questions || section.questions.length === 0) && (
                            <p className="italic text-gray-500">No questions in this section.</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AttemptDetails;

