import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { Users, FileText, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const StatCard = ({ title, value, icon: Icon, color, link }) => (
  <Link to={link} className={`bg-neo-white border-2 border-neo-black shadow-neo p-6 hover:-translate-y-1 hover:shadow-neo-hover transition-all cursor-pointer block relative overflow-hidden group`}>
    <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${color}`}>
        <Icon size={100} />
    </div>
    <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold uppercase">{title}</h3>
            <div className={`p-2 border-2 border-neo-black shadow-sm ${color} rounded-none`}>
                <Icon size={24} />
            </div>
        </div>
        <p className="text-5xl font-black">{value}</p>
    </div>
  </Link>
);

const Dashboard = () => {
  const { data: usersData } = useQuery({
    queryKey: ['users', 'count'],
    queryFn: async () => {
      const res = await api.get('/users?limit=1'); // Just need count
      return res.data;
    }
  });

  const { data: testsData } = useQuery({
    queryKey: ['tests', 'count'],
    queryFn: async () => {
      const res = await api.get('/tests?limit=1'); // Just need count
      return res.data;
    }
  });
  
  // Assuming there is an attempts endpoint we can count or just show 0 for now if not easily available count
  // The API has /attempts, let's fetch that too
   const { data: attemptsData } = useQuery({
    queryKey: ['attempts', 'count'],
    queryFn: async () => {
       // Assuming user_id is not required for admin to list all attempts, or if it is, this might fail.
       // Spec says user_id is query param. Let's try without it to see if it returns all.
       // If not, we might handle error or show 0.
      try {
        const res = await api.get('/attempts?limit=1'); 
        return res.data;
      } catch (e) {
        return { total: 0 };
      }
    }
  });


  return (
    <div>
      <h2 className="text-4xl font-black mb-8 uppercase">Dashboard Overview</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        <StatCard 
          title="Total Users" 
          value={usersData?.total || 0} 
          icon={Users} 
          color="bg-neo-accent"
          link="/users"
        />
        <StatCard 
          title="Active Tests" 
          value={testsData?.total || 0} 
          icon={FileText} 
          color="bg-neo-main"
          link="/tests"
        />
        <StatCard 
          title="Attempts" 
          value={attemptsData?.total || 0} 
          icon={CheckCircle} 
          color="bg-neo-success"
          link="/"
        />
      </div>

      <div className="bg-neo-white border-2 border-neo-black shadow-neo p-8">
        <h3 className="text-2xl font-bold mb-4 uppercase">Quick Actions</h3>
        <div className="flex gap-4">
            <Link to="/tests" className="neo-btn">Manage Tests</Link>
            <Link to="/users" className="neo-btn-secondary">Manage Users</Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

