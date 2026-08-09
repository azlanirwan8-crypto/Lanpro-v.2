import React from 'react';

const Dashboard = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="flex flex-col h-screen">
      <div className="h-screen flex bg-gray-50 text-gray-900 overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default Dashboard;
